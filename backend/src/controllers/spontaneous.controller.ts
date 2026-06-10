import { Request, Response } from 'express';
import { prisma } from '../db';
import { geminiService } from '../services/gemini.service';
import { usageService } from '../services/usage.service';
import { emailService, isEmailConfigured, EmailAttachment } from '../services/email.service';
import { loadUserGuards, scoreCompanyForUser } from '../services/spontaneous.guards';
import { AUTO_LEVEL_LABEL } from '../services/spontaneous.scoring.service';
import { pdfService } from '../services/pdf.service';

const monthKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Délai par défaut avant la première relance (jours)
export const FOLLOW_UP_DELAY_DAYS = 12;
export const MAX_FOLLOW_UPS = 2;

const withLabel = (s: any) => ({ ...s, autoLevelLabel: AUTO_LEVEL_LABEL[s.autoLevel as keyof typeof AUTO_LEVEL_LABEL] });

// Construit les pièces jointes PDF (lettre + CV) de façon défensive : un échec
// de génération ne doit jamais bloquer l'envoi de l'e-mail.
const buildAttachments = async (user: any, coverLetterText?: string | null): Promise<EmailAttachment[]> => {
  const attachments: EmailAttachment[] = [];
  try {
    if (coverLetterText) {
      const buf = await pdfService.coverLetterPdf(coverLetterText, user.name);
      attachments.push({ filename: 'Lettre-de-motivation.pdf', content: buf.toString('base64') });
    }
  } catch (e: any) { console.error('PDF lettre échoué', e?.message || e); }
  try {
    const buf = await pdfService.cvPdf(user);
    attachments.push({ filename: 'CV.pdf', content: buf.toString('base64') });
  } catch (e: any) { console.error('PDF CV échoué', e?.message || e); }
  return attachments;
};

export const spontaneousController = {
  /** Liste les candidatures spontanées de l'utilisateur (filtre statut optionnel). */
  list: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const status = req.query.status as string | undefined;
    const items = await prisma.spontaneousApplication.findMany({
      where: { userId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: items.map(withLabel) });
  },

  /** Détail d'une candidature spontanée. */
  get: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const item = await prisma.spontaneousApplication.findUnique({ where: { id: req.params.id } });
    if (!item || item.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Candidature introuvable.' });
    }
    res.json({ success: true, data: withLabel(item) });
  },

  /**
   * Prépare une candidature spontanée :
   *  - (re)calcule le niveau d'automatisation côté serveur (source de vérité),
   *  - génère + sauvegarde la lettre IA si demandée (débit quota),
   *  - crée l'entrée de suivi (Application, isSpontaneous) + la SpontaneousApplication.
   * Renvoie le record prêt (status READY ou PENDING_REVIEW selon autoLevel).
   */
  prepare: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const {
      companyName, companyAddress, companySector, companySize, domain,
      contactEmail, contactName, contactRole, contactSource,
      jobTitle, ftOfferId, ftOfferUrl, ftSource, reason, hiringPotential,
      includeLetter,
    } = req.body || {};

    if (!companyName || !jobTitle) {
      return res.status(400).json({ success: false, error: "Les champs 'companyName' et 'jobTitle' sont obligatoires." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });

    // 1. Scoring serveur (garde-fous DB inclus)
    const guards = await loadUserGuards(userId);
    const scoring = await scoreCompanyForUser(
      {
        companyName, domain, contactEmail, contactSource,
        hiringPotential, sector: companySector, companyLocation: companyAddress,
        ftSource, includeLetter: Boolean(includeLetter),
      },
      guards,
    );

    // 2. Lettre IA (si demandée) — consomme 1 candidature, remboursée si échec
    let coverLetterText: string | null = null;
    let coverLetterId: string | null = null;
    if (includeLetter) {
      const consumption = await usageService.consumeCandidature(userId);
      if (!consumption.allowed) {
        return res.status(402).json({
          success: false,
          code: 'QUOTA_EXCEEDED',
          error: "Vous avez atteint votre limite de candidatures ce mois-ci. Passez à l'abonnement Élite ou ajoutez un pack de crédits.",
        });
      }
      try {
        coverLetterText = await geminiService.generateCoverLetter(
          jobTitle, companyName, 'Professionnel et direct', user,
          `Raison de la candidature spontanée : ${reason || 'Entreprise en recrutement actif.'}`,
        );
        const saved = await prisma.coverLetter.create({
          data: { title: `Lettre — ${companyName}`, company: companyName, jobTitle, content: coverLetterText, userId },
        });
        coverLetterId = saved.id;
      } catch (e: any) {
        if (consumption.source) await usageService.refundCandidature(userId, consumption.source);
        console.error('Erreur IA lors de la génération de lettre', e);
        return res.status(503).json({ success: false, error: "Impossible de formuler la lettre via l'IA. Candidature annulée." });
      }
    }

    // 3. Entrée de suivi (kanban) — taggée spontanée
    const application = await prisma.application.create({
      data: {
        company: companyName,
        title: jobTitle,
        status: 'PENDING',
        source: 'Candidature spontanée',
        isSpontaneous: true,
        notes: `[Spontanée] ${reason || ''}`.trim(),
        userId,
      },
    });

    // 4. SpontaneousApplication. Statut : PENDING_REVIEW si validation requise, sinon READY.
    const status = scoring.autoLevel === 'AUTO_REVIEW' ? 'PENDING_REVIEW' : 'READY';
    const spontaneous = await prisma.spontaneousApplication.create({
      data: {
        userId,
        companyName, companyAddress, companySector, companySize,
        companyDomain: domain || (scoring.contactEmail?.split('@')[1] ?? null),
        contactEmail: scoring.contactEmail, contactName, contactRole,
        contactSource: scoring.contactSource,
        jobTitle, ftOfferId, ftOfferUrl, ftSource, reason, hiringPotential,
        coverLetterId, coverLetterText,
        autoLevel: scoring.autoLevel, autoScore: scoring.autoScore, autoBlockReason: scoring.autoBlockReason,
        status,
        applicationId: application.id,
      },
    });

    res.status(201).json({ success: true, data: withLabel(spontaneous), coverLetter: coverLetterText });
  },

  /**
   * Envoie (ou prépare l'envoi manuel de) la candidature.
   *  - NO_SEND  → renvoie le mode manuel + lien de l'offre.
   *  - Resend non configuré → mode manuel (aucun envoi réel).
   *  - sinon → envoi e-mail, MAJ statut SENT, planification relance, MAJ kanban.
   */
  send: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const sp = await prisma.spontaneousApplication.findUnique({ where: { id: req.params.id } });
    if (!sp || sp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Candidature introuvable.' });
    }
    if (sp.status === 'SENT' || sp.status === 'SENDING') {
      return res.status(409).json({ success: false, error: 'Candidature déjà envoyée.' });
    }

    // Blocage strict : aucune automatisation possible.
    if (sp.autoLevel === 'NO_SEND') {
      return res.json({
        success: true, manual: true, blocked: true,
        reason: sp.autoBlockReason,
        applyUrl: sp.ftOfferUrl || '',
        message: "Envoi automatique impossible — finalisez votre candidature manuellement.",
      });
    }

    // Resend non configuré → mode manuel honnête (on ne prétend pas avoir envoyé).
    if (!isEmailConfigured() || !sp.contactEmail) {
      return res.json({
        success: true, manual: true, blocked: false,
        applyUrl: sp.ftOfferUrl || '',
        message: sp.contactEmail
          ? "L'envoi e-mail n'est pas activé sur ce compte — finalisez manuellement."
          : "Aucune adresse e-mail — finalisez manuellement.",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });

    await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'SENDING' } });

    const attachments = await buildAttachments(user, sp.coverLetterText);
    const result = await emailService.sendSpontaneous({
      senderName: user.name,
      replyTo: user.email,
      to: sp.contactEmail,
      companyName: sp.companyName,
      jobTitle: sp.jobTitle,
      bodyText: sp.coverLetterText || `Bonjour,\n\nJe me permets de vous adresser ma candidature spontanée pour un poste de ${sp.jobTitle}.\n\nCordialement,\n${user.name}`,
      attachments,
    });

    if (!result.sent) {
      await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'READY' } });
      return res.status(502).json({ success: false, error: result.error || "Échec de l'envoi e-mail." });
    }

    // Succès : MAJ statut + relance planifiée + compteur auto + kanban.
    const followUpAt = new Date(Date.now() + FOLLOW_UP_DELAY_DAYS * 24 * 3600 * 1000);
    const updated = await prisma.spontaneousApplication.update({
      where: { id: sp.id },
      data: { status: 'SENT', sentAt: new Date(), messageId: result.messageId, followUpAt },
    });
    if (sp.applicationId) {
      await prisma.application.update({ where: { id: sp.applicationId }, data: { status: 'SENT' } });
    }
    const currentMonth = monthKey();
    await prisma.user.update({
      where: { id: userId },
      data: {
        autoSentThisMonth: user.autoSentMonth === currentMonth ? { increment: 1 } : 1,
        autoSentMonth: currentMonth,
      },
    });

    res.json({ success: true, manual: false, data: withLabel(updated) });
  },

  /** Relance manuelle d'une candidature déjà envoyée. */
  followUp: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const sp = await prisma.spontaneousApplication.findUnique({ where: { id: req.params.id } });
    if (!sp || sp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Candidature introuvable.' });
    }
    if (sp.status !== 'SENT' && sp.status !== 'FOLLOWED_UP') {
      return res.status(409).json({ success: false, error: 'Seule une candidature envoyée peut être relancée.' });
    }
    if (sp.followUpCount >= MAX_FOLLOW_UPS) {
      return res.status(409).json({ success: false, error: `Nombre maximal de relances atteint (${MAX_FOLLOW_UPS}).` });
    }
    if (!isEmailConfigured() || !sp.contactEmail) {
      return res.json({ success: true, manual: true, message: "Relance à effectuer manuellement (e-mail non activé)." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });

    const result = await emailService.sendSpontaneous({
      senderName: user.name,
      replyTo: user.email,
      to: sp.contactEmail,
      companyName: sp.companyName,
      jobTitle: sp.jobTitle,
      bodyText: `Bonjour,\n\nJe me permets de revenir vers vous concernant ma candidature spontanée pour un poste de ${sp.jobTitle}. Je reste très intéressé(e) et disponible pour en échanger.\n\nCordialement,\n${user.name}`,
      attachments: await buildAttachments(user, null),
    });
    if (!result.sent) return res.status(502).json({ success: false, error: result.error || "Échec de la relance." });

    const updated = await prisma.spontaneousApplication.update({
      where: { id: sp.id },
      data: { status: 'FOLLOWED_UP', followUpCount: { increment: 1 }, lastFollowUpAt: new Date(), followUpAt: null },
    });
    res.json({ success: true, data: withLabel(updated) });
  },

  /** Exclut une entreprise des futures candidatures + archive la candidature courante. */
  blacklist: async (req: Request, res: Response) => {
    const userId = req.userId!;
    const sp = await prisma.spontaneousApplication.findUnique({ where: { id: req.params.id } });
    if (!sp || sp.userId !== userId) {
      return res.status(404).json({ success: false, error: 'Candidature introuvable.' });
    }
    await prisma.companyBlacklist.upsert({
      where: { userId_companyName: { userId, companyName: sp.companyName } },
      create: { userId, companyName: sp.companyName, domain: sp.companyDomain, reason: req.body?.reason || null },
      update: { domain: sp.companyDomain, reason: req.body?.reason || null },
    });
    await prisma.spontaneousApplication.update({ where: { id: sp.id }, data: { status: 'ARCHIVED' } });
    res.json({ success: true });
  },
};
