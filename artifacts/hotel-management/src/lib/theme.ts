"use client";

export type Theme = "dark" | "light" | "custom";

export function setTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    // system
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("hms_theme", theme);
  }
}

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "light";
  return (localStorage.getItem("hms_theme") as Theme) ?? "light";
}
