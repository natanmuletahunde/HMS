"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DocumentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reports?tab=guests");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting to Guest Reports...</p>
    </div>
  );
}
