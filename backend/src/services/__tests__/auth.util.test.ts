/**
 * Tests autonomes des utilitaires d'authentification (cookie, nettoyage des champs
 * sensibles, comptes propriétaires). Aucun framework requis :
 * `npx ts-node --transpile-only src/services/__tests__/auth.util.test.ts`
 */
import assert from 'assert';
import { sanitizeUser, MIN_PASSWORD_LENGTH, COOKIE_OPTIONS, CLEAR_COOKIE_OPTIONS } from '../auth.util';
import { isOwnerEmail } from '../usage.service';

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

const fullUser = {
  id: 'u1',
  email: 'a@b.fr',
  name: 'Ada',
  plan: 'Gratuit',
  password: '$2a$10$hashhashhashhash',
  ftAccessToken: 'ft-access',
  ftRefreshToken: 'ft-refresh',
  resetTokenHash: 'sha256hash',
  resetTokenExpiry: new Date(),
};

test('sanitizeUser retire le hash du mot de passe, les jetons France Travail et le reset', () => {
  const safe = sanitizeUser(fullUser) as Record<string, unknown>;
  for (const f of ['password', 'ftAccessToken', 'ftRefreshToken', 'resetTokenHash', 'resetTokenExpiry']) {
    assert.ok(!(f in safe), `${f} ne doit pas être renvoyé`);
  }
});

test('sanitizeUser conserve les champs utiles au front', () => {
  const safe = sanitizeUser(fullUser);
  assert.strictEqual(safe.id, 'u1');
  assert.strictEqual(safe.email, 'a@b.fr');
  assert.strictEqual(safe.name, 'Ada');
  assert.strictEqual(safe.plan, 'Gratuit');
});

test("sanitizeUser ne modifie pas l'objet d'origine", () => {
  sanitizeUser(fullUser);
  assert.strictEqual(fullUser.password, '$2a$10$hashhashhashhash');
});

test('politique de mot de passe : 6 caractères minimum', () => {
  assert.strictEqual(MIN_PASSWORD_LENGTH, 6);
});

test("le cookie d'effacement n'a pas de maxAge mais garde les mêmes attributs", () => {
  assert.ok(!('maxAge' in CLEAR_COOKIE_OPTIONS));
  assert.strictEqual(CLEAR_COOKIE_OPTIONS.httpOnly, COOKIE_OPTIONS.httpOnly);
  assert.strictEqual(CLEAR_COOKIE_OPTIONS.secure, COOKIE_OPTIONS.secure);
  assert.strictEqual(CLEAR_COOKIE_OPTIONS.sameSite, COOKIE_OPTIONS.sameSite);
});

test('en production le cookie est SameSite=None; Secure (front et API sur des domaines différents)', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const modulePath = require.resolve('../auth.util');
  delete require.cache[modulePath];
  const prod = require('../auth.util');
  process.env.NODE_ENV = previous;
  delete require.cache[modulePath];

  assert.strictEqual(prod.COOKIE_OPTIONS.sameSite, 'none');
  assert.strictEqual(prod.COOKIE_OPTIONS.secure, true);
  assert.strictEqual(prod.COOKIE_OPTIONS.httpOnly, true);
  // La suppression doit reprendre EXACTEMENT ces attributs, sinon le navigateur l'ignore.
  assert.strictEqual(prod.CLEAR_COOKIE_OPTIONS.sameSite, 'none');
  assert.strictEqual(prod.CLEAR_COOKIE_OPTIONS.secure, true);
});

test('isOwnerEmail : insensible à la casse et aux espaces, faux si vide', () => {
  const previous = process.env.OWNER_EMAILS;
  process.env.OWNER_EMAILS = ' Boss@Joboost.app , other@x.fr ';
  try {
    assert.strictEqual(isOwnerEmail('boss@joboost.app'), true);
    assert.strictEqual(isOwnerEmail('OTHER@x.fr'), true);
    assert.strictEqual(isOwnerEmail('nobody@x.fr'), false);
    assert.strictEqual(isOwnerEmail(null), false);
    assert.strictEqual(isOwnerEmail(''), false);
  } finally {
    if (previous === undefined) delete process.env.OWNER_EMAILS;
    else process.env.OWNER_EMAILS = previous;
  }
});

console.log(`\n${passed} test(s) réussi(s).`);
