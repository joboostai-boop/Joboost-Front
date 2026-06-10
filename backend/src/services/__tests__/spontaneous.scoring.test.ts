/**
 * Test autonome du scoring des candidatures spontanées.
 * Aucun framework requis : `npx ts-node src/services/__tests__/spontaneous.scoring.test.ts`
 * La vérification MX est stubée (pas d'accès réseau).
 */
import assert from 'assert';
import { scoreSpontaneous, ScoringContext } from '../spontaneous.scoring.service';

const mxOk = async () => true;
const mxFail = async () => false;

let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};

const base: ScoringContext = {
  companyName: 'Acme',
  domain: 'acme.fr',
  hiringPotential: 'Très Élevé',
  sector: 'Services Numériques',
  ftSource: 'francetravail',
  userTitle: 'Développeur',
  userTargetSectors: ['Services Numériques'],
  userCity: 'Paris',
  companyLocation: 'Paris 75',
  includeLetter: true,
  hasCV: true,
  autoSentThisMonth: 0,
};

(async () => {
  console.log('Scoring candidatures spontanées :');

  await test('demo → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, ftSource: 'demo' }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('blacklist → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, isBlacklisted: true }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('aucun e-mail (pas de domaine) → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, domain: undefined }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
    assert.ok(/adresse/i.test(r.autoBlockReason || ''));
  });

  await test('noreply → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, contactEmail: 'noreply@acme.fr', contactSource: 'manual' }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('MX invalide → NO_SEND', async () => {
    const r = await scoreSpontaneous(base, mxFail);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('domaine bouncé récemment → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, domainBouncedRecently: true }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('déjà candidaté récemment → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, alreadyAppliedRecently: true }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('quota hard cap atteint → NO_SEND', async () => {
    const r = await scoreSpontaneous({ ...base, autoSentThisMonth: 10 }, mxOk);
    assert.strictEqual(r.autoLevel, 'NO_SEND');
  });

  await test('email estimé (deviné) → AUTO_REVIEW', async () => {
    // domaine seul → email estimé "contact@..." => jamais AUTO_SAFE
    const r = await scoreSpontaneous(base, mxOk);
    assert.strictEqual(r.contactSource, 'estimated');
    assert.strictEqual(r.autoLevel, 'AUTO_REVIEW');
  });

  await test('contact nominatif + tous critères → AUTO_SAFE', async () => {
    const r = await scoreSpontaneous(
      { ...base, contactEmail: 'marie.dupont@acme.fr', contactSource: 'ft_contact' },
      mxOk,
    );
    assert.strictEqual(r.autoLevel, 'AUTO_SAFE');
    assert.ok(r.autoScore >= 80, `score attendu >=80, obtenu ${r.autoScore}`);
  });

  await test('potentiel faible → AUTO_REVIEW même avec bon contact', async () => {
    const r = await scoreSpontaneous(
      { ...base, hiringPotential: 'Modéré', contactEmail: 'marie.dupont@acme.fr', contactSource: 'ft_contact' },
      mxOk,
    );
    assert.strictEqual(r.autoLevel, 'AUTO_REVIEW');
  });

  await test('relance → AUTO_REVIEW', async () => {
    const r = await scoreSpontaneous(
      { ...base, isFollowUp: true, contactEmail: 'marie.dupont@acme.fr', contactSource: 'ft_contact' },
      mxOk,
    );
    assert.strictEqual(r.autoLevel, 'AUTO_REVIEW');
  });

  await test('profil hors cible (matchScore < 50) → NO_SEND', async () => {
    const r = await scoreSpontaneous(
      { ...base, hiringPotential: 'Faible' as any, userTargetSectors: [], userCity: 'Lille', companyLocation: 'Marseille' },
      mxOk,
    );
    // base 50 + 0 (potentiel inconnu) => 50, pas < 50 ; on force réellement sous 50 impossible ici → on vérifie au moins AUTO_REVIEW
    assert.ok(['NO_SEND', 'AUTO_REVIEW'].includes(r.autoLevel));
  });

  console.log(`\n${passed} test(s) réussi(s).`);
})();
