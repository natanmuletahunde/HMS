"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuestPortalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect guest to the luxury hotel landing page
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center text-slate-300 font-sans">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-light tracking-wider text-slate-400">Redirecting to Luxury Hotel Experience...</p>
      </div>
    </div>
  );
}
