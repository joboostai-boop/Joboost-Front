/**
 * Test autonome de l'extraction d'email employeur.
 * Aucun framework requis : `npx ts-node src/services/__tests__/contactEmail.util.test.ts`
 */
import assert from 'assert';
import { extractContactEmail } from '../contactEmail.util';

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

console.log('Extraction email employeur :');

test('champ structuré prioritaire', () => {
  assert.strictEqual(
    extractContactEmail('rh@societe.fr', 'Contactez autre@ailleurs.fr'),
    'rh@societe.fr',
  );
});

test('email trouvé dans la description', () => {
  assert.strictEqual(
    extractContactEmail(undefined, 'Merci d’envoyer votre CV à recrutement@boulangerie-martin.fr avant le 30.'),
    'recrutement@boulangerie-martin.fr',
  );
});

test('ignore les adresses France Travail / Pôle emploi', () => {
  assert.strictEqual(
    extractContactEmail('Votre conseiller : ale.paris@francetravail.fr'),
    undefined,
  );
  assert.strictEqual(extractContactEmail('contact@agence.pole-emploi.fr'), undefined);
});

test('ignore les noreply', () => {
  assert.strictEqual(extractContactEmail('noreply@societe.fr'), undefined);
  assert.strictEqual(extractContactEmail('no-reply@societe.fr'), undefined);
});

test('ignore les faux positifs de fichiers (logo@2x.png)', () => {
  assert.strictEqual(extractContactEmail('<img src="logo@2x.png">'), undefined);
});

test('ignore les placeholders (example.com)', () => {
  assert.strictEqual(extractContactEmail('ex : nom@example.com'), undefined);
});

test('prend le 1er email employeur valable en sautant les parasites', () => {
  assert.strictEqual(
    extractContactEmail('Publié via conseiller@pole-emploi.fr — postulez à jobs@enterprise.com'),
    'jobs@enterprise.com',
  );
});

test('borne correctement (ponctuation autour)', () => {
  assert.strictEqual(
    extractContactEmail('Candidature: (cv@societe.fr).'),
    'cv@societe.fr',
  );
});

test('renvoie undefined si aucun email', () => {
  assert.strictEqual(extractContactEmail('Aucune adresse ici', null, undefined), undefined);
});

console.log(`\n${passed} test(s) OK.`);
