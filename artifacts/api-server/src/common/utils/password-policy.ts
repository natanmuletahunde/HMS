/**
 * Shared password-policy state & validation utility.
 * Imported by SecurityService (management) and UsersService (enforcement).
 * In Phase 7C this state will be persisted to a DB table.
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  expiryDays: number;
  preventReuse: number;
}

export const currentPolicy: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSymbols: true,
  expiryDays: 90,
  preventReuse: 5,
};

export function applyPolicyUpdate(updates: Partial<PasswordPolicy>): PasswordPolicy {
  Object.assign(currentPolicy, updates);
  return { ...currentPolicy };
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < currentPolicy.minLength)
    errors.push(`Password must be at least ${currentPolicy.minLength} characters`);
  if (currentPolicy.requireUppercase && !/[A-Z]/.test(password))
    errors.push('Password must contain at least one uppercase letter');
  if (currentPolicy.requireNumbers && !/[0-9]/.test(password))
    errors.push('Password must contain at least one number');
  if (currentPolicy.requireSymbols && !/[^A-Za-z0-9]/.test(password))
    errors.push('Password must contain at least one symbol');
  return { valid: errors.length === 0, errors };
}
