"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuildingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/branches?tab=buildings");
  }, [router]);

  return (
    <div className="p-8 text-center text-[var(--text-secondary)]">
      Redirecting to Buildings...
    </div>
  );
}
