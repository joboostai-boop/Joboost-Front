import { prisma } from '../db';

/**
 * Service de consommation des "candidatures IA".
 *
 * Modèle hybride : à chaque génération de lettre, on débite dans cet ordre :
 *   1) le quota mensuel de l'abonnement (remis à zéro chaque mois),
 *   2) puis les crédits achetés via packs (n'expirent pas avec le mois),
 *   3) sinon on bloque (le dépassement metered à 0,99 € n'est pas encore câblé côté Stripe).
 */

export const MONTHLY_ALLOWANCE = {
  elite: 150, // abonnement actif
  free: 1,    // plan Gratuit
};

const monthKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const allowanceFor = (subscriptionStatus: string | null): number =>
  subscriptionStatus === 'active' ? MONTHLY_ALLOWANCE.elite : MONTHLY_ALLOWANCE.free;

export type ConsumeSource = 'quota' | 'credit';

export interface ConsumeResult {
  allowed: boolean;
  source?: ConsumeSource;
  remainingQuota?: number;
  credits?: number;
  allowance?: number;
}

export const usageService = {
  /** Tente de consommer 1 candidature : quota mensuel d'abord, puis crédits. */
  consumeCandidature: async (userId: string): Promise<ConsumeResult> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, credits: true, monthlyUsage: true, usageMonth: true },
    });
    if (!user) return { allowed: false };

    const currentMonth = monthKey();
    const usedThisMonth = user.usageMonth === currentMonth ? user.monthlyUsage : 0;
    const allowance = allowanceFor(user.subscriptionStatus);

    // 1) Quota mensuel (reset implicite si on a changé de mois)
    if (usedThisMonth < allowance) {
      await prisma.user.update({
        where: { id: userId },
        data: { monthlyUsage: usedThisMonth + 1, usageMonth: currentMonth },
      });
      return {
        allowed: true,
        source: 'quota',
        remainingQuota: allowance - (usedThisMonth + 1),
        credits: user.credits,
        allowance,
      };
    }

    // 2) Crédits de packs
    if (user.credits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: 1 },
          // Si le mois a changé, on normalise le compteur au plafond (quota déjà épuisé ce mois-ci)
          ...(user.usageMonth !== currentMonth ? { monthlyUsage: allowance, usageMonth: currentMonth } : {}),
        },
      });
      return {
        allowed: true,
        source: 'credit',
        remainingQuota: 0,
        credits: user.credits - 1,
        allowance,
      };
    }

    // 3) Épuisé
    return { allowed: false, remainingQuota: 0, credits: 0, allowance };
  },

  /** Rembourse 1 candidature si la génération échoue après consommation. */
  refundCandidature: async (userId: string, source: ConsumeSource): Promise<void> => {
    if (source === 'credit') {
      await prisma.user.update({ where: { id: userId }, data: { credits: { increment: 1 } } });
      return;
    }
    // quota : on décrémente le compteur d'usage, borné à 0
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { monthlyUsage: true } });
    if (u && u.monthlyUsage > 0) {
      await prisma.user.update({ where: { id: userId }, data: { monthlyUsage: u.monthlyUsage - 1 } });
    }
  },

  /** État d'usage courant (pour affichage côté front). */
  getUsage: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionStatus: true, credits: true, monthlyUsage: true, usageMonth: true },
    });
    if (!user) return null;
    const currentMonth = monthKey();
    const usedThisMonth = user.usageMonth === currentMonth ? user.monthlyUsage : 0;
    const allowance = allowanceFor(user.subscriptionStatus);
    return {
      allowance,
      usedThisMonth,
      remainingQuota: Math.max(0, allowance - usedThisMonth),
      credits: user.credits,
    };
  },
};
