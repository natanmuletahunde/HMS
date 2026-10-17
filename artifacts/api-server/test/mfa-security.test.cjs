const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mfaEncrypt,
  mfaDecrypt,
  mfaEncryptCodes,
  mfaDecryptCodes,
} = require('../dist/common/utils/mfa-crypto');
const {
  generateMfaBackupCodes,
  consumeMfaBackupCode,
} = require('../dist/common/utils/mfa-backup-codes');

test('MFA secret and recovery codes round-trip through authenticated encryption', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const codes = ['ABCD2345', 'WXYZ6789'];
  assert.equal(mfaDecrypt(mfaEncrypt(secret)), secret);
  assert.deepEqual(mfaDecryptCodes(mfaEncryptCodes(codes)), codes);
});

test('MFA ciphertext tampering fails authentication', () => {
  const encrypted = Buffer.from(mfaEncrypt('sensitive-secret'), 'base64');
  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => mfaDecrypt(encrypted.toString('base64')));
});

test('MFA recovery codes use CSPRNG output and can be consumed only once', () => {
  const codes = generateMfaBackupCodes();
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  for (const code of codes) assert.match(code, /^[A-HJ-KM-NP-Z2-9]{8}$/);

  const first = consumeMfaBackupCode(codes, codes[0].toLowerCase());
  assert.equal(first.matched, true);
  assert.equal(first.remaining.length, 7);

  const reused = consumeMfaBackupCode(first.remaining, codes[0]);
  assert.equal(reused.matched, false);
  assert.deepEqual(reused.remaining, first.remaining);
});