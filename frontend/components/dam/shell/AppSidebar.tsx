"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, LogOut, Menu, PanelLeftClose } from "lucide-react";
import { CommandPalette } from "@/components/CommandPalette";
import { useDemoRole } from "@/components/RoleProvider";
import {
  damShellItemsForRole,
  damShellNavGroups,
  type DamShellNavItem
} from "@/components/dam/shell/damShellNav";
import { isDamShellRouteActive } from "@/lib/dam-route-identity";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { routeWithRole } from "@/lib/role-routes";

const sidebarGroupCopy: Record<string, { label: string; detail: string }> = {
  Media: { label: "Media", detail: "" },
  Workflow: { label: "Workflow", detail: "" },
  Governance: { label: "Governance", detail: "" },
  Admin: { label: "Admin", detail: "" },
  Support: { label: "Support", detail: "" }
};

function useCurrentHash(pathname: string, currentSearch: string) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash.replace(/^#/, ""));
    updateHash();
    window.addEventListener("hashchange", updateHash);
    window.addEventListener("popstate", updateHash);
    return () => {
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("popstate", updateHash);
    };
  }, [pathname, currentSearch]);

  return hash;
}

function SidebarLink({ item, compact = false }: { item: DamShellNavItem; compact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const currentHash = useCurrentHash(pathname, currentSearch);
  const { role } = useDemoRole();
  const { setOpenMobile, isMobile } = useSidebar();
  const Icon = item.icon;
  const active = isDamShellRouteActive({
    pathname,
    currentSearch,
    currentHash,
    href: item.href,
    activeHrefs: item.activeHrefs
  });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={active}
        size={compact ? "default" : "lg"}
        className={cn(
          "dam-sidebar-menu-button text-[#202020] hover:bg-[#f1f2f3] hover:text-black focus-visible:ring-sidebar-ring data-active:bg-[#eff3ef] data-active:text-black",
          active && "font-black"
        )}
        render={(
          <Link
            href={routeWithRole(item.href, role)}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (isMobile) setOpenMobile(false);
            }}
          />
        )}
      >
        <Icon aria-hidden="true" />
        <span>{item.label}</span>
        {item.badge ? <em className="dam-sidebar-badge">{item.badge}</em> : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function BrandLockup() {
  const { role } = useDemoRole();
  const { toggleSidebar } = useSidebar();
  return (
    <div className="dam-sidebar-brand flex min-h-12 min-w-0 items-center gap-3 px-2 text-[#111111]">
      <button
        type="button"
        className="dam-sidebar-collapsed-menu"
        onClick={toggleSidebar}
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>
      <Link
        href={routeWithRole("/library", role)}
        className="dam-sidebar-brand-link flex min-w-0 flex-1 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        aria-label="True Jesus Church Media Library home"
      >
        <span className="dam-sidebar-logo-mark grid size-7 shrink-0 place-items-center overflow-hidden">
          <img src="/brand/tjc-logo-english-color.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-sm font-black leading-tight">True Jesus Church</strong>
          <span className="block truncate text-xs font-semibold">Media Library</span>
        </span>
      </Link>
      <button
        type="button"
        className="dam-sidebar-top-collapse"
        onClick={toggleSidebar}
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <PanelLeftClose className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function SidebarUserCard() {
  const { role, betaLocked } = useDemoRole();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/beta-auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/beta-login");
    router.refresh();
  }

  return (
    <div className="dam-sidebar-user">
      <div className="dam-sidebar-avatar" aria-hidden="true">LC</div>
      <div className="min-w-0">
        <strong>{betaLocked ? "Internal beta access" : "admin"}</strong>
        <span>{role}</span>
      </div>
      {betaLocked ? (
        <button className="dam-sidebar-logout" type="button" onClick={logout} disabled={loggingOut} aria-label="Log out of internal beta access" title="Log out">
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function AppSidebar() {
  const { role } = useDemoRole();
  const visibleItems = damShellItemsForRole(role);
  const footerItems: DamShellNavItem[] = [];

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-2 p-3">
        <BrandLockup />
        <CommandPalette variant="bar" className="dam-sidebar-search" />
      </SidebarHeader>

      <SidebarContent className="px-2">
        {damShellNavGroups.map((group) => {
          const groupItems = visibleItems.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          const copy = sidebarGroupCopy[group] || { label: group, detail: "" };
          return (
            <SidebarGroup key={group} className="px-0 py-1">
              <SidebarGroupLabel className="dam-sidebar-group-label text-[#555555]">
                <span>{copy.label}</span>
                {copy.detail ? <em>{copy.detail}</em> : null}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {groupItems.map((item) => <SidebarLink key={`${item.group}-${item.href}`} item={item} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <SidebarMenu className="gap-1">
          {footerItems.map((item) => <SidebarLink compact key={`footer-${item.href}`} item={item} />)}
        </SidebarMenu>
        <SidebarUserCard />

        <Link
          href={routeWithRole("/help", role)}
          className="hidden min-h-10 place-items-center rounded-lg text-[#202020] transition hover:bg-[#f1f2f3] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:grid"
          aria-label="Help Center"
          title="Help Center"
        >
          <HelpCircle className="size-4" aria-hidden="true" />
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
