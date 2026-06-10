import { prisma } from '../db';
import { scoreSpontaneous, ScoringContext, ScoringResult } from './spontaneous.scoring.service';

// ====================================================================
//  Garde-fous des candidatures spontanées (accès base de données).
//  Centralise la collecte de l'historique utilisateur nécessaire au scoring
//  et fournit l'enrichissement d'une "carte entreprise" avec son niveau d'automatisation.
// ====================================================================

const monthKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const domainOf = (email?: string | null): string | undefined =>
  email && email.includes('@') ? email.split('@')[1]?.toLowerCase() : undefined;

export interface UserGuards {
  userTitle: string | null;
  userCity: string | null;
  userTargetSectors: string[];
  hasCV: boolean;
  autoSentThisMonth: number;
  blacklistedNames: Set<string>;
  blacklistedDomains: Set<string>;
  recentCompanyNames: Set<string>;   // candidatures < 6 mois (anti-doublon)
  bouncedDomains: Set<string>;       // domaines ayant bouncé < 90 jours
}

/** Charge en une passe tout ce dont le scoring a besoin pour un utilisateur. */
export const loadUserGuards = async (userId: string): Promise<UserGuards> => {
  const sixMonthsAgo = new Date(Date.now() - 182 * 24 * 3600 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const [user, cvCount, blacklist, recent, bounced] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { title: true, city: true, targetSectors: true, autoSentThisMonth: true, autoSentMonth: true },
    }),
    prisma.cV.count({ where: { userId } }),
    prisma.companyBlacklist.findMany({ where: { userId }, select: { companyName: true, domain: true } }),
    prisma.spontaneousApplication.findMany({
      where: { userId, createdAt: { gte: sixMonthsAgo } },
      select: { companyName: true },
    }),
    prisma.spontaneousApplication.findMany({
      where: { userId, bouncedAt: { gte: ninetyDaysAgo } },
      select: { companyDomain: true, contactEmail: true },
    }),
  ]);

  const autoSentThisMonth = user?.autoSentMonth === monthKey() ? (user?.autoSentThisMonth ?? 0) : 0;

  return {
    userTitle: user?.title ?? null,
    userCity: user?.city ?? null,
    userTargetSectors: user?.targetSectors ?? [],
    hasCV: cvCount > 0,
    autoSentThisMonth,
    blacklistedNames: new Set(blacklist.map((b) => b.companyName.toLowerCase())),
    blacklistedDomains: new Set(blacklist.map((b) => b.domain?.toLowerCase()).filter(Boolean) as string[]),
    recentCompanyNames: new Set(recent.map((r) => r.companyName.toLowerCase())),
    bouncedDomains: new Set(
      bounced.map((b) => (b.companyDomain || domainOf(b.contactEmail))?.toLowerCase()).filter(Boolean) as string[],
    ),
  };
};

export interface CompanyInput {
  companyName: string;
  domain?: string;
  contactEmail?: string;
  contactSource?: ScoringContext['contactSource'];
  hiringPotential?: string;
  sector?: string;
  companyLocation?: string;
  ftSource?: string;
  includeLetter?: boolean;
  isFollowUp?: boolean;
}

/** Calcule le scoring d'une entreprise pour un utilisateur, en appliquant tous les garde-fous DB. */
export const scoreCompanyForUser = async (
  company: CompanyInput,
  guards: UserGuards,
): Promise<ScoringResult> => {
  const dom = (company.domain || domainOf(company.contactEmail))?.toLowerCase();
  return scoreSpontaneous({
    companyName: company.companyName,
    domain: company.domain,
    contactEmail: company.contactEmail,
    contactSource: company.contactSource,
    hiringPotential: company.hiringPotential,
    sector: company.sector,
    ftSource: company.ftSource,
    userTitle: guards.userTitle,
    userTargetSectors: guards.userTargetSectors,
    userCity: guards.userCity,
    companyLocation: company.companyLocation,
    includeLetter: company.includeLetter,
    hasCV: guards.hasCV,
    isBlacklisted:
      guards.blacklistedNames.has(company.companyName.toLowerCase()) ||
      (dom ? guards.blacklistedDomains.has(dom) : false),
    alreadyAppliedRecently: guards.recentCompanyNames.has(company.companyName.toLowerCase()),
    domainBouncedRecently: dom ? guards.bouncedDomains.has(dom) : false,
    autoSentThisMonth: guards.autoSentThisMonth,
    isFollowUp: company.isFollowUp,
  });
};
