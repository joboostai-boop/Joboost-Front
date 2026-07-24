/**
 * Test autonome des garde-fous du détecteur de contact (fonctions pures, sans réseau).
 * `npx ts-node src/services/__tests__/contactDetector.service.test.ts`
 */
import assert from 'assert';
import { isPlaceholderEmail, siteMatchesCompany } from '../contactDetector.service';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e: any) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
};

console.log('Détecteur de contact — garde-fous :');

test('placeholder : votre@email.com rejeté', () => {
  assert.strictEqual(isPlaceholderEmail('votre@email.com'), true);
});
test('placeholder : nom@domain.com rejeté', () => {
  assert.strictEqual(isPlaceholderEmail('nom@domain.com'), true);
  assert.strictEqual(isPlaceholderEmail('vous@exemple.fr'), true);
  assert.strictEqual(isPlaceholderEmail('votre-email@email.fr'), true);
});
test('placeholder : exemple@example.com rejeté', () => {
  assert.strictEqual(isPlaceholderEmail('test@example.com'), true);
});
test('email réel accepté', () => {
  assert.strictEqual(isPlaceholderEmail('contact@batistyl.fr'), false);
  assert.strictEqual(isPlaceholderEmail('recrutement@boulangerie-martin.fr'), false);
});

test('site match : le texte mentionne le nom', () => {
  assert.strictEqual(siteMatchesCompany('Bienvenue chez Batistyl, votre menuisier', 'BATISTYL MENUISERIES', 'Nantes'), true);
});
test('site match : le texte mentionne la ville', () => {
  assert.strictEqual(siteMatchesCompany('Notre atelier à Mantes-la-Jolie', 'BOULANGERIE X', 'Mantes-la-Jolie'), true);
});
test('site NON confirmé : ni nom ni ville', () => {
  assert.strictEqual(siteMatchesCompany('Franchise nationale de boulangerie', 'BOULANGERIE DE LA FONTAINE', 'Paris'), false);
});

console.log(`\n${passed} test(s) OK.`);
