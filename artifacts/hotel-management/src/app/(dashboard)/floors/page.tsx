"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FloorsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/branches?tab=floors");
  }, [router]);

  return (
    <div className="p-8 text-center text-[var(--text-secondary)]">
      Redirecting to Floors...
    </div>
  );
}
