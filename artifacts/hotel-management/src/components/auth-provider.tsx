"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isOnDuty?: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (token: string, user: User) => void;
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
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("hms_token");
        localStorage.removeItem("hms_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, rawUser: any) => {
    const role = rawUser.role || rawUser.roleName || "Admin";
    const name = rawUser.name || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || rawUser.email;
    const normalized: User = {
      ...rawUser,
      role,
      roleName: role,
      name,
    };
    localStorage.setItem("hms_token", token);
    localStorage.setItem("hms_user", JSON.stringify(normalized));
    setUser(normalized);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("hms_token");
    localStorage.removeItem("hms_user");
    setUser(null);
    router.push("/login");
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

  return (
    <AuthContext.Provider value={{ user, login, logout, toggleOnDuty, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
