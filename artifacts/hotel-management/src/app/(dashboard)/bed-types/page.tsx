"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/room-configs?tab=beds");
  }, [router]);

  return (
    <div className="p-8 text-center text-text-muted">
      Redirecting to /room-configs?tab=beds...
    </div>
  );
}
