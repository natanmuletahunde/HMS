const MIN_SESSION_SECRET_BYTES = 32;

/**
 * Return the configured session secret or fail closed.
 *
 * This secret signs access, refresh, MFA-pending, and WebSocket JWTs and derives
 * the MFA encryption key, so a development fallback would make every security
 * boundary forgeable in a misconfigured deployment.
 */
export function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error(
      'SESSION_SECRET is required. Configure it in the environment secret store before starting Nexus HMS.',
    );
  }
  if (Buffer.byteLength(secret, 'utf8') < MIN_SESSION_SECRET_BYTES) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_BYTES} bytes.`,
    );
  }
  return secret;
}