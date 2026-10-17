/**
 * AES-256-GCM at-rest encryption for MFA TOTP secrets and backup codes.
 *
 * A 32-byte key is derived from SESSION_SECRET via scrypt (Nexus HMS MFA salt).
 * Each ciphertext includes a random IV and an authentication tag, so:
 *   - DB reads cannot reconstruct the TOTP secret without the key.
 *   - Backup codes cannot be replayed from a DB dump.
 *
 * SESSION_SECRET MUST be set in the environment — the module throws at startup
 * if it is absent rather than silently falling back to a weak default.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { requireSessionSecret } from '../config/runtime-secrets';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;  // 96-bit IV recommended for GCM
const TAG_LEN = 16; // 128-bit authentication tag

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;
  const secret = requireSessionSecret();
  _key = scryptSync(secret, 'nexus-hms-mfa-v1', 32) as Buffer;
  return _key;
}

/**
 * Encrypt a UTF-8 plaintext string.
 * Returns a base64-encoded blob: [12-byte IV] [16-byte GCM tag] [ciphertext]
 */
export function mfaEncrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a base64-encoded ciphertext produced by mfaEncrypt.
 * Throws if the authentication tag does not match (tampered / wrong key).
 */
export function mfaDecrypt(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}

/** Encrypt a string array (backup codes) as a JSON-encoded blob. */
export function mfaEncryptCodes(codes: string[]): string {
  return mfaEncrypt(JSON.stringify(codes));
}

/** Decrypt a backup-code blob and return the string array. */
export function mfaDecryptCodes(blob: string): string[] {
  try {
    return JSON.parse(mfaDecrypt(blob)) as string[];
  } catch {
    return [];
  }
}
