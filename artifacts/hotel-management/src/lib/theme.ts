"use client";

export type Theme = "light";

export function setTheme(_theme?: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  root.setAttribute("data-theme", "light");

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("hms_theme", "light");
  }
}

export function getStoredTheme(): Theme {
  return "light";
}
