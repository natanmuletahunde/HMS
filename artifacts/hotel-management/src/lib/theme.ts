"use client";

export type Theme = "dark" | "light" | "custom";

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  muted: string;
  danger: string;
}

const DARK_THEME: ThemeColors = {
  primary: "#00c5c8",
  background: "#0d0d0f",
  surface: "#141417",
  border: "#1e1e24",
  text: "#ffffff",
  textMuted: "#8b8b9a",
  muted: "#1a1a1f",
  danger: "#ef4444",
};

const LIGHT_THEME: ThemeColors = {
  primary: "#0ea5e9",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  muted: "#f1f5f9",
  danger: "#ef4444",
};

function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-bg", colors.background);
  root.style.setProperty("--color-surface", colors.surface);
  root.style.setProperty("--color-border", colors.border);
  root.style.setProperty("--color-text", colors.text);
  root.style.setProperty("--color-text-muted", colors.textMuted);
  root.style.setProperty("--color-muted", colors.muted);
  root.style.setProperty("--color-danger", colors.danger);
}

export function setTheme(theme: Theme, customColors?: Partial<ThemeColors>) {
  const colors =
    theme === "light" ? LIGHT_THEME
    : theme === "custom" ? { ...DARK_THEME, ...customColors }
    : DARK_THEME;
  applyTheme(colors);
  if (typeof localStorage !== "undefined") localStorage.setItem("hms_theme", theme);
}

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  return (localStorage.getItem("hms_theme") as Theme) ?? "dark";
}

export { DARK_THEME, LIGHT_THEME };
