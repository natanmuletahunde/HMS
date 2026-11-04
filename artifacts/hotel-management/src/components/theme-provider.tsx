"use client";
import { useEffect } from "react";
import { setTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setTheme("light");
  }, []);
  return <>{children}</>;
}
