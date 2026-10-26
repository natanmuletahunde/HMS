"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
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
  email: string;
  role: string;
  roleName?: string;
  roleScope?: string;
  primaryBranchId?: string | null;
  activeBranchId?: string | null;
  branches?: BranchSummary[];
  isOnDuty?: boolean;
};

type AuthContextType = {
  user: User | null;
  activeBranch: BranchSummary | null;
  branches: BranchSummary[];
  switchBranch: (branchId: string) => void;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  toggleOnDuty: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
      } catch (e) {
        localStorage.removeItem("hms_token");
        localStorage.removeItem("hms_user");
        localStorage.removeItem("hms_refresh_token");
        localStorage.removeItem("hms_active_branch_id");
      }
    }
    setIsLoading(false);
  }, []);

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
