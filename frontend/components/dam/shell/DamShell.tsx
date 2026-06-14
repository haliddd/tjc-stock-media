"use client";

import { Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { AppSidebar } from "@/components/dam/shell/AppSidebar";
import { DamCommandHeader } from "@/components/dam/shell/DamCommandHeader";
import { useDemoRole } from "@/components/RoleProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { routeWithRole } from "@/lib/role-routes";

const SIDEBAR_STORAGE_KEY = "tjc-dam-sidebar-open";

function PersistentSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "false") setOpenState(false);
    if (stored === "true") setOpenState(true);
  }, []);

  const setOpen = useCallback((nextOpen: boolean) => {
    setOpenState(nextOpen);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextOpen));
  }, []);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      className="dam-workbench-v2 dam-command-shell min-h-[100dvh] bg-tjc-bg text-tjc-ink"
      style={{ "--sidebar-width": "15rem", "--sidebar-width-icon": "3.05rem" } as CSSProperties}
    >
      {children}
    </SidebarProvider>
  );
}

function DamFooter() {
  const { role, betaLocked } = useDemoRole();
  return (
    <footer className="relative z-10 mx-auto flex w-full max-w-[1760px] flex-wrap items-center gap-3 border-t border-[#d8e1da] px-4 py-6 text-sm font-semibold text-tjc-muted md:px-6">
      <Link href={routeWithRole("/guide", role)} className="font-black text-tjc-evergreen">Help</Link>
      <span>Review queues, evidence, and audit-safe actions stay together.</span>
      <span>{betaLocked ? "Internal beta access. Role personas are for QA testing only. Not production SSO." : "Production access follows assigned DAM roles."}</span>
    </footer>
  );
}

function BetaAccessBanner() {
  const { betaLocked } = useDemoRole();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!betaLocked) return null;
  async function logout() {
    setLoggingOut(true);
    await fetch("/api/beta-auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/beta-login");
    router.refresh();
  }
  return (
    <section className="beta-access-banner" aria-label="Internal beta access notice">
      <strong>Internal beta access</strong>
      <span>Role personas are for QA testing only.</span>
      <span>Not production SSO.</span>
      <span>Do not upload sensitive production media yet.</span>
      <span>Live DAM media storage may be pending; unavailable records stay clearly marked.</span>
      <button type="button" onClick={logout} disabled={loggingOut}>Log out</button>
    </section>
  );
}

export function DamShell({ children }: { children: ReactNode }) {
  return (
    <PersistentSidebarProvider>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <SidebarInset className="min-w-0 bg-transparent">
        <Suspense fallback={null}>
          <DamCommandHeader />
        </Suspense>
        <BetaAccessBanner />
        <div id="main-content" className="relative z-10 min-w-0 flex-1 pb-4 md:pb-10">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <BetaPrototypeTools />
        <Toaster
          position="bottom-center"
          offset={{ bottom: "7.25rem" }}
          mobileOffset={{ bottom: "calc(var(--app-mobile-nav-height) + var(--app-mobile-safe-bottom) + 1.25rem)", left: ".75rem", right: ".75rem" }}
          toastOptions={{
            classNames: {
              toast: "rounded-lg border border-[#d6dfd8] bg-white text-tjc-ink shadow-[0_18px_50px_rgba(17,24,39,.16)]",
              title: "font-black text-tjc-ink",
              description: "font-semibold text-tjc-muted"
            }
          }}
        />
        <DamFooter />
      </SidebarInset>
    </PersistentSidebarProvider>
  );
}
