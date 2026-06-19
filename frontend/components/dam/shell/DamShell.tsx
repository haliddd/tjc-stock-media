"use client";

import { Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Toaster } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { AppSidebar } from "@/components/dam/shell/AppSidebar";
import { DamCommandHeader } from "@/components/dam/shell/DamCommandHeader";
import { getVisibleMobileNavItems, workspaceCopyForPath } from "@/components/dam/shell/damShellNav";
import { useDemoRole } from "@/components/RoleProvider";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { isDamShellRouteActive } from "@/lib/dam-route-identity";
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
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3.05rem" } as CSSProperties}
    >
      {children}
    </SidebarProvider>
  );
}

function DamFooter() {
  const { role, betaLocked } = useDemoRole();
  return (
    <footer className="relative z-10 mx-auto flex w-full max-w-[1760px] flex-wrap items-center gap-3 border-t border-[#d8e1da] px-4 py-6 text-sm font-semibold text-tjc-muted md:px-6">
      <Link href={routeWithRole("/help", role)} className="font-black text-tjc-evergreen">Help Center</Link>
      <span>Uploads, review, and approved photos stay together.</span>
      <span>{betaLocked ? "Restricted media portal access. Use only assigned beta workflows." : "Access follows assigned media portal roles."}</span>
    </footer>
  );
}

function MobileAppBars() {
  const { role } = useDemoRole();
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() || "";
  const workspace = workspaceCopyForPath(pathname, currentSearch);
  const bottomItems = getVisibleMobileNavItems(role);

  return (
    <>
      <header className="dam-mobile-topbar" aria-label="Mobile app bar">
        <Link href={routeWithRole("/", role)} className="dam-mobile-brand" aria-label="Open Media Portal">
          <span aria-hidden="true">
            <img src="/brand/tjc-logo-english-color.png" alt="" />
          </span>
          <strong>{workspace.title}</strong>
        </Link>
        <Link className="dam-mobile-icon" href={routeWithRole("/library", role)} aria-label="Search media" title="Search media">
          <Search size={18} aria-hidden="true" />
        </Link>
        <button className="dam-mobile-icon" type="button" onClick={() => setOpenMobile(true)} aria-label="Open navigation menu" title="Open navigation menu">
          <Menu size={19} aria-hidden="true" />
        </button>
      </header>
      <nav className="dam-mobile-bottom-nav" aria-label="Primary mobile navigation">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isDamShellRouteActive({
            pathname,
            currentSearch,
            href: item.href,
            activeHrefs: item.activeHrefs
          });
          return (
            <Link key={item.href} href={routeWithRole(item.href, role)} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.mobileLabel || item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function HelpFooterGate() {
  const pathname = usePathname() || "/";
  if (!pathname.startsWith("/help") && !pathname.startsWith("/guide")) return null;
  return <DamFooter />;
}

function BetaPrototypeToolsGate() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("taskMode") === "1");
  }, []);
  if (!enabled) return null;
  return <BetaPrototypeTools />;
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
    <section className="beta-access-banner" aria-label="Restricted media portal access notice">
      <strong>Restricted media portal access</strong>
      <span>Use only assigned restricted-access workflows.</span>
      <span>Identity setup is still being verified.</span>
      <span>Keep sensitive media out until access is confirmed.</span>
      <span>Unavailable photos stay clearly marked.</span>
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
          <MobileAppBars />
        </Suspense>
        <Suspense fallback={null}>
          <DamCommandHeader />
        </Suspense>
        <BetaAccessBanner />
        <div id="main-content" className="relative z-10 min-w-0 flex-1 pb-4 md:pb-10">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <BetaPrototypeToolsGate />
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
        <HelpFooterGate />
      </SidebarInset>
    </PersistentSidebarProvider>
  );
}
