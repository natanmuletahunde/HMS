"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname changes, complete and reset progress
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // Intercept click on internal links for instant visual feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || target.target === "_blank") {
        return;
      }

      // If clicking the current path, no navigation needed
      const targetPath = href.split("?")[0];
      if (targetPath === pathname) return;

      setIsNavigating(true);
      setProgress(30);

      // Smooth step
      const stepTimer = setTimeout(() => {
        setProgress((prev) => (prev < 80 ? 75 : prev));
      }, 150);

      return () => clearTimeout(stepTimer);
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [pathname]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-cyan-300 to-primary shadow-[0_0_8px_rgba(0,197,200,0.8)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
