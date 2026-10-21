"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoomServiceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/stay?tab=room-service");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <p className="text-sm text-text-muted">Loading In-House Guest & Services Hub...</p>
    </div>
  );
}
