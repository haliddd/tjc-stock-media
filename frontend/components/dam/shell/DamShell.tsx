"use client";

import { Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderOpen, HelpCircle, Library, Menu, Search, ShieldCheck, UploadCloud } from "lucide-react";
import { Toaster } from "sonner";
import { BetaPrototypeTools } from "@/components/BetaPrototypeTools";
import { AppSidebar } from "@/components/dam/shell/AppSidebar";
import { DamCommandHeader } from "@/components/dam/shell/DamCommandHeader";
import { workspaceCopyForPath } from "@/components/dam/shell/damShellNav";
import { useDemoRole } from "@/components/RoleProvider";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
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
      <span>Review queues, evidence, and audit-safe actions stay together.</span>
      <span>{betaLocked ? "Internal beta access. Role personas are for QA testing only. Not production SSO." : "Production access follows assigned DAM roles."}</span>
    </footer>
  );
}

function isActiveMobilePath(pathname: string, href: string) {
  if (href === "/library") return pathname === "/" || pathname === "/library" || pathname.startsWith("/library/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MobileAppBars() {
  const { role } = useDemoRole();
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspace = workspaceCopyForPath(pathname, searchParams.toString());
  const bottomItems = [
    { label: "Library", href: "/library", icon: Library },
    { label: "Upload", href: "/upload", icon: UploadCloud },
    { label: "Review", href: "/review", icon: ShieldCheck },
    { label: "Collections", href: "/collections", icon: FolderOpen },
    { label: "Help", href: "/help", icon: HelpCircle }
  ];

  return (
    <>
      <header className="dam-mobile-topbar" aria-label="Mobile app bar">
        <Link href={routeWithRole("/library", role)} className="dam-mobile-brand" aria-label="Open Library">
          <span aria-hidden="true">
            <img src="/brand/tjc-logo-english-color.png" alt="" />
          </span>
          <strong>{workspace.title}</strong>
        </Link>
        <Link className="dam-mobile-icon" href={routeWithRole("/library", role)} aria-label="Search Library" title="Search Library">
          <Search size={18} aria-hidden="true" />
        </Link>
        <button className="dam-mobile-icon" type="button" onClick={() => setOpenMobile(true)} aria-label="Open navigation menu" title="Open navigation menu">
          <Menu size={19} aria-hidden="true" />
        </button>
      </header>
      <nav className="dam-mobile-bottom-nav" aria-label="Primary mobile navigation">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActiveMobilePath(pathname, item.href);
          return (
            <Link key={item.href} href={routeWithRole(item.href, role)} aria-current={active ? "page" : undefined} className={active ? "is-active" : undefined}>
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function HelpFooterGate() {
  const pathname = usePathname();
  if (!pathname.startsWith("/help") && !pathname.startsWith("/guide")) return null;
  return <DamFooter />;
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
          <MobileAppBars />
        </Suspense>
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
        <HelpFooterGate />
      </SidebarInset>
    </PersistentSidebarProvider>
  );
}
