/**
 * Fusionne plusieurs comptes partenaires dans UNE SEULE organisation.
 *
 * Pourquoi : à l'inscription, `auth.controller` crée systématiquement une nouvelle
 * `Organization`. Trois collègues qui s'inscrivent avec le même nom d'organisme se
 * retrouvent donc dans trois organisations distinctes, sans rien voir les uns des
 * autres. Ce script les rattache à une organisation unique — après quoi le partage
 * du vivier et des offres est automatique (cf. `getOrgScope` dans business.controller).
 *
 * SIMULATION PAR DÉFAUT. Le script n'écrit RIEN tant que `--apply` n'est pas passé :
 * il touche des données de production, on regarde avant de toucher.
 *
 * Usage :
 *   # 1. Simuler (aucune écriture, affiche le plan d'action)
 *   npx ts-node --transpile-only src/scripts/merge-organizations.ts a@x.fr b@x.fr c@x.fr
 *
 *   # 2. Appliquer
 *   npx ts-node --transpile-only src/scripts/merge-organizations.ts a@x.fr b@x.fr c@x.fr --apply
 *
 * L'organisation CONSERVÉE est la plus ancienne, en privilégiant celle qui possède
 * déjà un logo (c'est celle que l'organisme a pris la peine de configurer).
 */
import { prisma } from '../db';

const log = (...a: any[]) => console.log(...a);

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const emails = args.filter((a) => !a.startsWith('--')).map((e) => e.trim().toLowerCase());

  if (emails.length < 2) {
    console.error('Usage : merge-organizations.ts <email1> <email2> [email3…] [--apply]');
    process.exit(1);
  }

  log(apply ? '⚠️  MODE APPLICATION — les écritures seront effectuées.' : 'ℹ️  SIMULATION — aucune écriture. Ajoutez --apply pour exécuter.');
  log('');

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: { organization: true },
  });

  const missing = emails.filter((e) => !users.some((u) => u.email.toLowerCase() === e));
  if (missing.length) {
    console.error(`❌ Comptes introuvables : ${missing.join(', ')}`);
    process.exit(1);
  }

  const notPartner = users.filter((u) => u.role !== 'BUSINESS_PARTNER');
  if (notPartner.length) {
    console.error(`❌ Ces comptes ne sont pas des comptes partenaires : ${notPartner.map((u) => u.email).join(', ')}`);
    console.error('   Fusionner un compte candidat exposerait ses données au vivier. Abandon.');
    process.exit(1);
  }

  log('Comptes concernés :');
  for (const u of users) {
    log(`  • ${u.email}  (org: ${u.organization?.name ?? '—'} / ${u.organizationId ?? 'aucune'}, plan: ${u.plan}, créé le ${u.createdAt.toISOString().slice(0, 10)})`);
  }
  log('');

  // ── Organisation conservée : la plus ancienne, en privilégiant celle qui a un logo.
  const orgs = users
    .map((u) => u.organization)
    .filter((o): o is NonNullable<typeof o> => !!o);

  if (orgs.length === 0) {
    console.error('❌ Aucun de ces comptes n’a d’organisation. Rien à fusionner.');
    process.exit(1);
  }

  const uniqueOrgs = Array.from(new Map(orgs.map((o) => [o.id, o])).values());
  const withLogo = uniqueOrgs.filter((o) => !!o.logoUrl);
  const pool = withLogo.length > 0 ? withLogo : uniqueOrgs;
  const target = pool.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));

  log(`Organisation conservée : « ${target.name} » (${target.id})`);
  log(`  logo : ${target.logoUrl ? 'oui' : 'non'} · créée le ${target.createdAt.toISOString().slice(0, 10)}`);
  const doomed = uniqueOrgs.filter((o) => o.id !== target.id);
  if (doomed.length) {
    log(`Organisations absorbées : ${doomed.map((o) => `« ${o.name} » (${o.id})`).join(', ')}`);
  }
  log('');

  const toMove = users.filter((u) => u.organizationId !== target.id);
  log(`Rattachement : ${toMove.length} compte(s) à déplacer vers l'organisation conservée.`);
  for (const u of toMove) log(`  • ${u.email}`);
  log('');

  // ── Doublons d'affiliation entre collègues.
  // L'unicité en base porte sur [businessId, jobseekerId] : elle empêche UN membre
  // d'affilier deux fois la même personne, mais pas deux collègues de le faire chacun
  // de leur côté. Une fois fusionnés, l'adhérent apparaîtrait en double dans le vivier.
  const memberIds = users.map((u) => u.id);
  const affiliations = await prisma.businessAffiliation.findMany({
    where: { businessId: { in: memberIds } },
    orderBy: { affiliatedAt: 'asc' },
  });

  const emailById = new Map(users.map((u) => [u.id, u.email]));

  // On conserve la PLUS ANCIENNE affiliation par adhérent (celle d'origine, avec son
  // statut). Mais on ne jette PAS les notes CRM des doublons : deux conseillers ont pu
  // suivre la même personne et écrire chacun ses observations. Supprimer la ligne du
  // second effacerait son travail sans retour possible — on fusionne donc les notes
  // dans celle qui reste, en indiquant leur provenance.
  const kept = new Map<string, (typeof affiliations)[number]>();       // jobseekerId -> affiliation conservée
  const keptById = new Map<string, (typeof affiliations)[number]>();   // id -> même affiliation (accès direct)
  const duplicates: string[] = [];
  const noteMerges = new Map<string, string[]>(); // id conservé -> notes à rapatrier

  for (const a of affiliations) {
    const existing = kept.get(a.jobseekerId);
    if (!existing) { kept.set(a.jobseekerId, a); keptById.set(a.id, a); continue; }
    duplicates.push(a.id);
    const note = (a.note || '').trim();
    if (note) {
      const from = emailById.get(a.businessId) || a.businessId;
      const bucket = noteMerges.get(existing.id) || [];
      bucket.push(`[note de ${from}] ${note}`);
      noteMerges.set(existing.id, bucket);
    }
  }

  log(`Vivier : ${affiliations.length} affiliation(s), ${kept.size} adhérent(s) distinct(s).`);
  if (duplicates.length) {
    log(`  ⚠️  ${duplicates.length} doublon(s) à supprimer (le même adhérent affilié par plusieurs collègues).`);
    log('     La plus ANCIENNE affiliation est conservée, avec son statut.');
    if (noteMerges.size) {
      let n = 0;
      noteMerges.forEach((v) => { n += v.length; });
      log(`     ${n} note(s) CRM des doublons seront RAPATRIÉES dans l'affiliation conservée`);
      log('     (préfixées par l\'email de leur auteur) — aucune note n\'est perdue.');
    } else {
      log('     Aucun doublon ne porte de note : rien à rapatrier.');
    }
  } else {
    log('  Aucun doublon.');
  }
  log('');

  const offers = await prisma.businessOffer.count({ where: { businessId: { in: memberIds } } });
  log(`Offres mises en commun : ${offers} (aucune modification, elles deviennent visibles par tous les membres).`);
  log('');

  if (!apply) {
    log('✅ Simulation terminée. Rien n’a été modifié.');
    log('   Relancez avec --apply pour exécuter ce plan.');
    return;
  }

  // ── Application, dans une transaction : tout ou rien.
  await prisma.$transaction(async (tx) => {
    // Rapatrier les notes AVANT de supprimer les doublons : si la transaction échoue
    // après coup, elle est annulée en entier — mais l'ordre garde l'intention claire.
    for (const [keptId, notes] of noteMerges) {
      const current = keptById.get(keptId)!;
      const merged = [(current.note || '').trim(), ...notes].filter(Boolean).join('\n\n');
      await tx.businessAffiliation.update({ where: { id: keptId }, data: { note: merged } });
    }
    if (duplicates.length) {
      await tx.businessAffiliation.deleteMany({ where: { id: { in: duplicates } } });
    }
    await tx.user.updateMany({
      where: { id: { in: toMove.map((u) => u.id) } },
      data: { organizationId: target.id },
    });
    // Les organisations absorbées n'ont plus de membre : on les supprime pour ne pas
    // laisser d'entités fantômes portant le même nom.
    if (doomed.length) {
      const stillUsed = await tx.user.findMany({
        where: { organizationId: { in: doomed.map((o) => o.id) } },
        select: { id: true, email: true, organizationId: true },
      });
      const safeToDelete = doomed.filter((o) => !stillUsed.some((u) => u.organizationId === o.id));
      if (safeToDelete.length !== doomed.length) {
        const kept = doomed.filter((o) => !safeToDelete.includes(o));
        log(`  ℹ️  Organisations conservées car encore rattachées à d'autres comptes : ${kept.map((o) => o.name).join(', ')}`);
      }
      if (safeToDelete.length) {
        await tx.organization.deleteMany({ where: { id: { in: safeToDelete.map((o) => o.id) } } });
      }
    }
  });

  log('✅ Fusion appliquée.');
  log(`   ${toMove.length} compte(s) rattaché(s) à « ${target.name} ».`);
  log(`   ${duplicates.length} doublon(s) d'affiliation supprimé(s).`);
  log('   Les trois comptes partagent désormais vivier, offres et statistiques.');
}

main()
  .catch((e) => {
    console.error('❌ Échec :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
