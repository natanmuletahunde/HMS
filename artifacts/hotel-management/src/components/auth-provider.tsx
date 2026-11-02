"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, isTokenExpired, attemptTokenRecovery } from "@/lib/api";

export type BranchSummary = {
  id: string;
  branchName: string;
  branchCode: string;
  isPrimary?: boolean;
};

export type User = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  faydaId?: string | null;
  role: string;
  roleName?: string;
  roleScope?: string;
  permissions?: string[];
  primaryBranchId?: string | null;
  activeBranchId?: string | null;
  branches?: BranchSummary[];
  isOnDuty?: boolean;
  isActive?: boolean;
};

type AuthContextType = {
  user: User | null;
  activeBranch: BranchSummary | null;
  branches: BranchSummary[];
  switchBranch: (branchId: string) => void;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  toggleOnDuty: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const syncMe = useCallback(async () => {
    try {
      const freshUser = await apiFetch<any>("/auth/me");
      if (freshUser && freshUser.id) {
        if (freshUser.isActive === false) {
          localStorage.removeItem("hms_token");
          localStorage.removeItem("hms_user");
          localStorage.removeItem("hms_refresh_token");
          localStorage.removeItem("hms_active_branch_id");
          setUser(null);
          window.location.href = "/login?deactivated=1";
          return;
        }

        const savedActiveBranchId = localStorage.getItem("hms_active_branch_id");
        const role = freshUser.roleName || freshUser.role || "Staff";
        const name = freshUser.name || `${freshUser.firstName || ''} ${freshUser.lastName || ''}`.trim() || freshUser.email;
        const branches: BranchSummary[] = freshUser.branches || [];
        const primaryBranch = branches.find((b) => b.isPrimary) || branches[0] || null;
        const activeBranchId = savedActiveBranchId || freshUser.activeBranchId || freshUser.primaryBranchId || primaryBranch?.id || null;

        const normalized: User = {
          ...freshUser,
          role,
          roleName: role,
          roleScope: freshUser.roleScope || "branch",
          permissions: Array.isArray(freshUser.permissions) ? freshUser.permissions : [],
          name,
          branches,
          primaryBranchId: freshUser.primaryBranchId || primaryBranch?.id || null,
          activeBranchId,
        };

        localStorage.setItem("hms_user", JSON.stringify(normalized));
        setUser(normalized);
      }
    } catch (err: any) {
      if (
        String(err?.message || '').toLowerCase().includes("deactivate") ||
        String(err?.message || '').toLowerCase().includes("unauthorized")
      ) {
        localStorage.removeItem("hms_token");
        localStorage.removeItem("hms_user");
        localStorage.removeItem("hms_refresh_token");
        localStorage.removeItem("hms_active_branch_id");
        setUser(null);
        window.location.href = "/login?deactivated=1";
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("hms_token");
    const savedUser = localStorage.getItem("hms_user");
    const savedActiveBranchId = localStorage.getItem("hms_active_branch_id");
    
    if (token && savedUser) {
      try {
        const parsed: User = JSON.parse(savedUser);
        if (savedActiveBranchId) {
          parsed.activeBranchId = savedActiveBranchId;
        } else if (!parsed.activeBranchId && parsed.primaryBranchId) {
          parsed.activeBranchId = parsed.primaryBranchId;
          localStorage.setItem("hms_active_branch_id", parsed.primaryBranchId);
        } else if (!parsed.activeBranchId && parsed.branches && parsed.branches.length > 0) {
          parsed.activeBranchId = parsed.branches[0].id;
          localStorage.setItem("hms_active_branch_id", parsed.branches[0].id);
        }

        if (isTokenExpired(token)) {
          // Attempt silent renewal in background
          attemptTokenRecovery().then((recovered) => {
            if (recovered) {
              setUser(parsed);
              syncMe();
            } else {
              localStorage.removeItem("hms_token");
              localStorage.removeItem("hms_user");
              localStorage.removeItem("hms_refresh_token");
              localStorage.removeItem("hms_active_branch_id");
              setUser(null);
            }
            setIsLoading(false);
          });
          return;
        }
        setUser(parsed);
        // Refresh fresh permissions and details from server
        syncMe();
      } catch (e) {
        localStorage.removeItem("hms_token");
        localStorage.removeItem("hms_user");
        localStorage.removeItem("hms_refresh_token");
        localStorage.removeItem("hms_active_branch_id");
      }
    }
    setIsLoading(false);
  }, [syncMe]);

  // Real-time BroadcastChannel for cross-tab immediate lockout
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("hms_user_events");
    bc.onmessage = (event) => {
      if (event.data?.type === "PERMISSIONS_UPDATED" || event.data?.type === "ROLE_UPDATED") {
        syncMe();
      }
      if (event.data?.type === "USER_DEACTIVATED" && event.data?.userId === user?.id) {
        localStorage.removeItem("hms_token");
        localStorage.removeItem("hms_user");
        localStorage.removeItem("hms_refresh_token");
        localStorage.removeItem("hms_active_branch_id");
        setUser(null);
        window.location.href = "/login?deactivated=1";
      }
    };
    return () => {
      bc.close();
    };
  }, [user?.id]);

  // Periodic heartbeat (every 4s) and on-focus check
  useEffect(() => {
    const heartbeat = setInterval(() => {
      const token = localStorage.getItem("hms_token");
      if (token && !isTokenExpired(token)) {
        syncMe();
      }
    }, 4000);

    const onFocus = () => {
      const token = localStorage.getItem("hms_token");
      if (token && !isTokenExpired(token)) {
        syncMe();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncMe]);

  const login = (token: string, rawUser: any, refreshToken?: string) => {
    const role = rawUser.roleName || rawUser.role || "Staff";
    const name = rawUser.name || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || rawUser.email;
    const branches: BranchSummary[] = rawUser.branches || [];
    const primaryBranch = branches.find((b) => b.isPrimary) || branches[0] || null;
    const activeBranchId = rawUser.activeBranchId || rawUser.primaryBranchId || primaryBranch?.id || null;

    const normalized: User = {
      ...rawUser,
      role,
      roleName: role,
      roleScope: rawUser.roleScope || "branch",
      permissions: Array.isArray(rawUser.permissions) ? rawUser.permissions : [],
      name,
      branches,
      primaryBranchId: rawUser.primaryBranchId || primaryBranch?.id || null,
      activeBranchId,
    };

    localStorage.setItem("hms_token", token);
    localStorage.setItem("hms_user", JSON.stringify(normalized));
    if (activeBranchId) {
      localStorage.setItem("hms_active_branch_id", activeBranchId);
    }
    if (refreshToken) {
      localStorage.setItem("hms_refresh_token", refreshToken);
    }
    setUser(normalized);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("hms_token");
    localStorage.removeItem("hms_user");
    localStorage.removeItem("hms_refresh_token");
    localStorage.removeItem("hms_active_branch_id");
    setUser(null);
    router.push("/login");
  };

  const switchBranch = (branchId: string) => {
    if (!user) return;
    const updatedUser: User = {
      ...user,
      activeBranchId: branchId,
    };
    localStorage.setItem("hms_active_branch_id", branchId);
    localStorage.setItem("hms_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    // Reload page to re-render all active branch queries seamlessly
    window.location.reload();
  };

  const toggleOnDuty = () => {
    if (!user) return;
    const nextState = user.isOnDuty === false ? true : false;
    const updated = { ...user, isOnDuty: nextState };
    localStorage.setItem("hms_user", JSON.stringify(updated));
    setUser(updated);
    if (user.id) {
      apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isOnDuty: nextState }),
      }).catch(() => {});
    }
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (
      user.roleName === "Admin" ||
      user.roleName === "System Admin" ||
      user.role === "Admin" ||
      user.roleScope === "global" ||
      user.permissions?.includes("*")
    ) {
      return true;
    }
    if (user.permissions?.includes(permission)) return true;
    if (permission.includes(":")) {
      const [domain] = permission.split(":");
      if (user.permissions?.includes(`${domain}:*`)) return true;
    }
    return false;
  }, [user]);

  const branches = user?.branches || [];
  const activeBranch = useMemo(() => {
    if (!user?.activeBranchId || !branches.length) return branches[0] || null;
    return branches.find((b) => b.id === user.activeBranchId) || branches[0] || null;
  }, [user?.activeBranchId, branches]);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBranch,
        branches,
        switchBranch,
        login,
        logout,
        toggleOnDuty,
        refreshUser: syncMe,
        hasPermission,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
