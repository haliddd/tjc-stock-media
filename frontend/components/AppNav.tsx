"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Box, ClipboardList, Grid3X3, HelpCircle, Library, Settings, type LucideIcon } from "lucide-react";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole } from "@/lib/types";
import { cn } from "@/lib/ui";

type AppNavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  group: "Browse" | "Workflow" | "Operations";
  adminOnly?: boolean;
  reviewerOnly?: boolean;
};

const appNav: AppNavItem[] = [
  { href: "/", label: "Assets", mobileLabel: "Assets", icon: Library, group: "Browse" },
  { href: "/collections", label: "Collections", mobileLabel: "Collections", icon: Grid3X3, group: "Browse" },
  { href: "/packages", label: "Package Builder", mobileLabel: "Builder", icon: Box, group: "Workflow" },
  { href: "/help", label: "Help Center", mobileLabel: "Help", icon: HelpCircle, group: "Workflow" },
  { href: "/review", label: "Review", mobileLabel: "Review", icon: ClipboardList, group: "Operations", reviewerOnly: true },
  { href: "/insights", label: "Insights", mobileLabel: "Insights", icon: BarChart3, group: "Operations" },
  { href: "/admin", label: "Admin", mobileLabel: "Admin", icon: Settings, group: "Operations", adminOnly: true },
];

function navItemsForRole(role: DemoRole) {
  const reviewer = role === "Reviewer" || role === "DAM Admin";
  return appNav.filter((item) => {
    if (item.adminOnly && role !== "DAM Admin") return false;
    if (item.reviewerOnly && !reviewer) return false;
    return true;
  });
}

type AppNavProps = {
  role: DemoRole;
  variant?: "top" | "mobile" | "menu";
  onNavigate?: () => void;
};

export function AppNav({ role, variant = "mobile", onNavigate }: AppNavProps) {
  const pathname = usePathname();
  const top = variant === "top";
  const menu = variant === "menu";
  const visibleItems = navItemsForRole(role);
  const navGroups = menu
    ? (["Browse", "Workflow", "Operations"] as const)
      .map((group) => ({ group, items: visibleItems.filter((item) => item.group === group) }))
      .filter(({ items }) => items.length)
    : [{ group: "Browse" as const, items: visibleItems }];
  const renderNavItem = (item: AppNavItem) => {
    const Icon = item.icon;
    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const label = top || menu ? item.label : item.mobileLabel || item.label;

    return (
      <Link
        key={`${item.href}-${item.label}`}
        href={routeWithRole(item.href, role)}
        className={cn(
          "group relative inline-flex min-w-0 flex-1 items-center justify-center font-black text-[#5b655f] transition-all duration-200 hover:text-tjc-evergreen active:translate-y-px",
          top && "min-h-11 flex-none gap-2 rounded-xl px-4 text-sm",
          menu && "min-h-12 justify-start gap-3 rounded-xl px-3 text-sm",
          !top && !menu && "min-h-14 flex-col gap-1 rounded-md px-1.5 text-[11px]",
          isActive && "text-tjc-evergreen"
        )}
        title={item.label}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
      >
        {isActive ? <span className="absolute inset-0 rounded-[inherit] bg-white shadow-[0_8px_24px_rgba(15,61,46,.10)]" aria-hidden="true" /> : null}
        <Icon className={cn("relative z-10 shrink-0", top ? "h-[16px] w-[16px]" : menu ? "h-[17px] w-[17px]" : "h-5 w-5")} aria-hidden="true" strokeWidth={1.9} />
        <span className={cn("nav-label relative z-10 truncate leading-none", top && "max-w-none")}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "tubelight-nav border border-[#c9d4d5] bg-white",
        top && "workbench-nav flex max-w-full items-center gap-1 rounded-2xl border-[#c6d6ce] bg-[#f8fbf8] p-1 shadow-none",
        menu && "workbench-menu-nav grid gap-1 rounded-xl border-[#d7dde2] bg-[#f8fbf8] p-1 shadow-none",
        !top && !menu && "mx-auto flex w-full max-w-[34rem] items-center gap-1 rounded-lg p-1 shadow-none"
      )}
      aria-label="Primary navigation"
    >
      {menu
        ? navGroups.map(({ group, items }) => (
          <div className="dam-nav-group" key={group}>
            <span className="dam-nav-group-label">{group}</span>
            {items.map(renderNavItem)}
          </div>
        ))
        : visibleItems.map(renderNavItem)}
    </nav>
  );
}
