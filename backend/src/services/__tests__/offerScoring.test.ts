import assert from 'node:assert/strict';
import { scoreOffer, dedupeKey, normalizeText, keywords } from '../offerScoring';

const profile = { targetTitle: 'Assistante administrative', skills: ['Excel', 'Accueil', 'Gestion de planning'], contractTypes: ['CDI'] };

const run = (name: string, fn: () => void) => {
  fn();
  console.log(`  ✓ ${name}`);
};

run('normalise écriture inclusive et (H/F)', () => {
  assert.equal(normalizeText('Assistant·e administratif·ve (H/F)'), 'assistant administratif');
});

run('masculin et féminin ont la même racine', () => {
  assert.deepEqual(keywords('Assistante administrative'), keywords('Assistant administratif'));
  assert.deepEqual(keywords('Vendeuse'), keywords('Vendeur'));
  assert.deepEqual(keywords('Animatrice'), keywords('Animateur'));
});

run('offre du bon métier : score élevé', () => {
  const r = scoreOffer({ title: 'Assistant administratif H/F', type: 'CDI', aiInsight: 'Accueil, Excel, gestion de planning.' }, profile);
  assert.ok(r.score >= 85, `score ${r.score}`);
  assert.equal(r.relevant, true);
});

run('offre hors sujet : score bas et marquée non pertinente', () => {
  const r = scoreOffer({ title: 'Document Controller / Gestionnaire documentaire F/H', type: 'CDI', aiInsight: 'Gestion de la documentation technique des projets.' }, profile);
  assert.ok(r.score < 60, `score ${r.score}`);
  assert.equal(r.relevant, false);
});

run('doublon entre sources malgré graphie différente', () => {
  assert.equal(dedupeKey('Assistant·e administratif·ve (H/F)', 'LUMEN CONSEIL SAS'), dedupeKey('Assistante administrative', 'Lumen Conseil'));
});
