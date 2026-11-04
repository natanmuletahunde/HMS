"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RolesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/users?tab=roles");
  }, [router]);

  return (
    <div className="h-48 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
    </div>
  );
}
