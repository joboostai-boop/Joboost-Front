/**
 * Test autonome de la validation/normalisation des emails de compte.
 * Aucun framework requis : `npx ts-node src/services/__tests__/userEmail.util.test.ts`
 */
import assert from 'assert';
import { isValidEmail, normalizeEmail } from '../userEmail.util';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
};

console.log('Emails de compte :');

test('adresse classique acceptée', () => {
  assert.strictEqual(isValidEmail('alexandra.figueiredo@hotmail.fr'), true);
});

test('domaine sans extension refusé (cas réel du 30/07)', () => {
  assert.strictEqual(isValidEmail('jeudbnemkidnbek@gmail'), false);
});

test('sous-domaine accepté', () => {
  assert.strictEqual(isValidEmail('contact@mail.joboost.app'), true);
});

test('arobase manquante refusée', () => {
  assert.strictEqual(isValidEmail('sana.joboost.app'), false);
});

test('espace interne refusé', () => {
  assert.strictEqual(isValidEmail('sana anger@gmail.com'), false);
});

test('point final sans extension refusé', () => {
  assert.strictEqual(isValidEmail('sana@gmail.'), false);
});

test('valeur non-chaîne refusée sans lever', () => {
  assert.strictEqual(isValidEmail(undefined), false);
  assert.strictEqual(isValidEmail(42), false);
});

test('normalisation : casse et espaces', () => {
  assert.strictEqual(normalizeEmail('  Alexandra.Figueiredo@Hotmail.FR '), 'alexandra.figueiredo@hotmail.fr');
});

test('espaces autour tolérés à la validation', () => {
  assert.strictEqual(isValidEmail('  sana@joboost.app  '), true);
});

console.log(`\n${passed} tests OK`);
