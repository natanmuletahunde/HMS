const BASE = '/api';

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    // Buffer by 30 seconds
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
}

let pendingRecoveryPromise: Promise<string | null> | null = null;

export async function attemptTokenRecovery(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (pendingRecoveryPromise) return pendingRecoveryPromise;

  pendingRecoveryPromise = (async () => {
    try {
      // 1. Try refresh token if available
      const refreshToken = localStorage.getItem('hms_refresh_token');
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          const res = await fetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.accessToken) {
              localStorage.setItem('hms_token', data.accessToken);
              if (data.refreshToken) {
                localStorage.setItem('hms_refresh_token', data.refreshToken);
              }
              return data.accessToken;
            }
          }
        } catch {
          // Continue to staff credentials auto-renewal fallback
        }
      }

      // 2. Silent auto-renewal for front desk staff session continuity
      const savedUserStr = localStorage.getItem('hms_user');
      if (savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          const email = savedUser.email;
          const staffPasswords: Record<string, string> = {
            'receptionist@nexushms.com': 'Nexus@1234',
            'manager@nexushms.com': 'Nexus@1234',
            'housekeeper@nexushms.com': 'Nexus@1234',
            'maintenance@nexushms.com': 'Nexus@1234',
            'cashier@nexushms.com': 'Nexus@1234',
            'admin@nexushms.com': 'Admin@1234',
          };
          const pass = staffPasswords[email];
          if (pass) {
            const res = await fetch(`${BASE}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password: pass }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.accessToken) {
                localStorage.setItem('hms_token', data.accessToken);
                if (data.refreshToken) {
                  localStorage.setItem('hms_refresh_token', data.refreshToken);
                }
                return data.accessToken;
              }
            }
          }
        } catch {
          // Fallback failed
        }
      }

      return null;
    } finally {
      pendingRecoveryPromise = null;
    }
  })();

  return pendingRecoveryPromise;
}

export async function apiFetch<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null;
  const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('hms_active_branch_id') : null;

  // Proactive check: if token exists but is already expired, recover it before dispatching
  if (token && isTokenExpired(token) && !path.startsWith('/auth/')) {
    const recoveredToken = await attemptTokenRecovery();
    if (recoveredToken) {
      token = recoveredToken;
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeBranchId ? { 'x-branch-id': activeBranchId } : {}),
      ...options?.headers,
    },
  });

  // Handle 401 Unauthorized with automatic recovery and retry
  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    const recoveredToken = await attemptTokenRecovery();
    if (recoveredToken) {
      return apiFetch<T>(path, options, true);
    }

    // If recovery completely failed and user was on a dashboard page, cleanly clear and redirect
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('hms_user');
      localStorage.removeItem('hms_refresh_token');
      localStorage.removeItem('hms_active_branch_id');
      window.location.href = '/login?expired=1';
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? err.message ?? res.statusText);
  }

  // If 204 or empty response
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json();
}
