"use client";
import { useEffect } from "react";
import { getStoredTheme, setTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const theme = getStoredTheme();
    setTheme(theme);
  }, []);
  return <>{children}</>;
}
