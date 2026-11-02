"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rooms?tab=categories");
  }, [router]);

  return (
    <div className="p-8 text-center text-text-muted">
      Redirecting to /rooms?tab=categories...
    </div>
  );
}
