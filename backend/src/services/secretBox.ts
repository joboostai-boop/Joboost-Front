// ====================================================================
//  Chiffrement des secrets stockés (mots de passe d'application Gmail).
//  AES-256-GCM : confidentialité + intégrité (une donnée altérée est refusée).
//  Clé : MAILBOX_ENC_KEY, valeur aléatoire d'au moins 32 caractères (variable
//  d'environnement, jamais dans le code).
// ====================================================================
import crypto from 'crypto';

// N'importe quelle valeur aléatoire d'au moins 32 caractères convient (ex. bouton
// « Generate » de Render) : on en dérive une clé de 32 octets par SHA-256.
// ⚠️ Changer cette valeur rend illisibles les secrets déjà stockés (les candidats
// devront reconnecter leur boîte).
const key = (): Buffer => {
  const raw = process.env.MAILBOX_ENC_KEY || '';
  if (raw.length < 32) throw new Error('MAILBOX_ENC_KEY absente ou trop courte (32 caractères minimum).');
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
};

export const isSecretBoxConfigured = (): boolean => {
  try { key(); return true; } catch { return false; }
};

export const seal = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
};

export const open = (sealed: string): string => {
  const [iv, tag, enc] = sealed.split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};
