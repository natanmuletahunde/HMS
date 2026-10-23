"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import AiAssistant from "@/components/ai-assistant";

import { usePathname } from "next/navigation";
import { isRouteAuthorized } from "@/lib/rbac";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationProgress } from "@/components/navigation-progress";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-bg" />;
  }

  const currentRole = user?.role || (user as any)?.roleName || "Staff";
  const authorized = isRouteAuthorized(currentRole, pathname);

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      <NavigationProgress />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {!authorized ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-surface rounded-2xl border border-border shadow-sm">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">Access Restricted</h2>
              <p className="text-text-muted max-w-md mb-6">
                Your assigned role <span className="font-semibold text-primary">({currentRole})</span> does not have authorized permission to access the <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{pathname}</code> module.
              </p>
              <Button onClick={() => router.push("/dashboard")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Authorized Dashboard
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <AiAssistant />
    </div>
  );
}
