import crypto from 'crypto';

/**
 * Reversible storage for Assigning-IDs passwords so the founder can view/copy
 * them again later (their explicit call — bcrypt hash below remains the sole
 * authority for actual login checks, this is display-only).
 * Set HR_CREDENTIAL_ENCRYPTION_KEY in production; falls back to JWT_SECRET in
 * dev so this doesn't require extra setup to run locally.
 */
const SECRET =
  process.env.HR_CREDENTIAL_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'hr-credentials-fallback-key-change-in-production';
const KEY = crypto.scryptSync(SECRET, 'hr-employee-credentials', 32);

export interface EncryptedPassword {
  ciphertext: string; // base64
  iv: string; // hex
  tag: string; // hex
}

export function encryptPassword(plain: string): EncryptedPassword {
  const ivBuf = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, ivBuf);
  const ciphertextBuf = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tagBuf = cipher.getAuthTag();
  return { ciphertext: ciphertextBuf.toString('base64'), iv: ivBuf.toString('hex'), tag: tagBuf.toString('hex') };
}

export function decryptPassword(ciphertext: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
