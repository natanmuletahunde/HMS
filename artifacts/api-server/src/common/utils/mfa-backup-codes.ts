import { randomBytes, timingSafeEqual } from 'crypto';

// I, L, O, 0, and 1 are omitted to reduce transcription errors.
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateMfaBackupCodes(count = 8, length = 8): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 32) {
    throw new Error('Backup code count must be an integer between 1 and 32');
  }
  if (!Number.isInteger(length) || length < 6 || length > 32) {
    throw new Error('Backup code length must be an integer between 6 and 32');
  }

  return Array.from({ length: count }, () => {
    let code = '';
    const acceptanceLimit = 256 - (256 % BACKUP_CODE_ALPHABET.length);
    while (code.length < length) {
      for (const byte of randomBytes(length)) {
        if (byte < acceptanceLimit) {
          code += BACKUP_CODE_ALPHABET[byte % BACKUP_CODE_ALPHABET.length];
          if (code.length === length) break;
        }
      }
    }
    return code;
  });
}

function equalsCode(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function consumeMfaBackupCode(
  codes: string[],
  candidate: string,
): { matched: boolean; remaining: string[] } {
  const normalized = candidate.trim().toUpperCase();
  const index = codes.findIndex(code => equalsCode(code.toUpperCase(), normalized));
  if (index === -1) return { matched: false, remaining: [...codes] };

  const remaining = [...codes];
  remaining.splice(index, 1);
  return { matched: true, remaining };
}