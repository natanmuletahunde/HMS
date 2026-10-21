"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WalkInRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/guests");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm font-medium">Redirecting to Guest Management & Registration Stepper...</p>
    </div>
  );
}
