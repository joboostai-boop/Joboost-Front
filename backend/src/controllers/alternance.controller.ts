import { Request, Response } from 'express';
import { prisma } from '../db';
import { laBonneAlternanceService, isLbaConfigured } from '../services/labonnealternance.service';
import { geocodeLocation } from '../services/labonneboite.service';
import { franceTravailService } from '../services/francetravail.service';
import { pdfService } from '../services/pdf.service';

export const alternanceController = {
  /**
   * Recherche d'offres + entreprises en alternance.
   * Query : jobTitle (métier), location (ville), diploma (3-7), distance (km).
   * Géocode la ville et résout le code ROME, puis interroge La Bonne Alternance.
   */
  search: async (req: Request, res: Response) => {
    if (!isLbaConfigured()) {
      return res.status(503).json({ success: false, error: "L'alternance n'est pas encore activée sur ce serveur." });
    }
    const jobTitle = (req.query.jobTitle as string) || '';
    const location = (req.query.location as string) || 'Paris';
    const diploma = req.query.diploma ? parseInt(req.query.diploma as string, 10) : undefined;
    const radius = req.query.distance ? parseInt(req.query.distance as string, 10) : 30;

    const [geo, romeCode] = await Promise.all([
      geocodeLocation(location),
      jobTitle ? franceTravailService.resolveRomeCode(jobTitle, location).catch(() => undefined) : Promise.resolve(undefined),
    ]);
    if (!geo) return res.status(400).json({ success: false, error: 'Localisation introuvable.' });

    try {
      const results = await laBonneAlternanceService.search({
        latitude: geo.lat, longitude: geo.lon, radius,
        romes: romeCode, diplomaLevel: diploma,
      });
      // `sample` = 1er élément brut : utile pour vérifier la structure réelle au 1er test.
      return res.json({ success: true, source: 'labonnealternance', count: results.length, results, sample: results[0]?.raw ?? null });
    } catch (e: any) {
      console.error('Alternance search error:', e?.message || e);
      return res.status(502).json({ success: false, error: "La recherche d'alternance est momentanément indisponible." });
    }
  },

  /**
   * Postule à une opportunité alternance via le relais officiel (CV + message).
   * Body : recipientId (requis), message, company, title (pour le suivi).
   * L'API transmet la candidature au recruteur ; on ajoute un suivi Kanban.
   */
  apply: async (req: Request, res: Response) => {
    if (!isLbaConfigured()) {
      return res.status(503).json({ success: false, error: "L'alternance n'est pas encore activée sur ce serveur." });
    }
    const { recipientId, message, company, title } = req.body || {};
    if (!recipientId) return res.status(400).json({ success: false, error: "'recipientId' est requis." });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
    if (!user.email) return res.status(400).json({ success: false, error: "Renseignez votre email dans le profil avant de postuler." });

    const firstName = user.firstName || user.name?.split(' ')[0] || 'Candidat';
    const lastName = user.lastName || user.name?.split(' ').slice(1).join(' ') || firstName;

    // CV en PDF (base64) — l'API l'exige en pièce jointe.
    let attachmentContent: string;
    try {
      const buf = await pdfService.cvPdf(user);
      attachmentContent = buf.toString('base64');
    } catch (e: any) {
      console.error('CV PDF échoué (alternance):', e?.message || e);
      return res.status(500).json({ success: false, error: 'Impossible de générer votre CV.' });
    }

    const result = await laBonneAlternanceService.apply({
      recipientId,
      firstName, lastName,
      email: user.email,
      phone: user.phone || undefined,
      attachmentName: 'CV.pdf',
      attachmentContent,
      message,
    });
    if (!result.sent) {
      return res.status(502).json({ success: false, error: result.error || "Échec de l'envoi de la candidature." });
    }

    // Suivi Kanban (comme les autres candidatures)
    try {
      await prisma.application.create({
        data: {
          company: company || 'Entreprise (alternance)',
          title: title || 'Candidature en alternance',
          status: 'SENT',
          source: 'Alternance',
          userId: user.id,
        },
      });
    } catch (e: any) {
      console.error('Suivi Kanban alternance non créé:', e?.message || e); // non bloquant
    }

    return res.json({ success: true, id: result.id });
  },
};
