"use client";

import {
  Bell,
  Boxes,
  Clock3,
  Database,
  FileCheck2,
  FolderClock,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UploadCloud,
  UserCog,
  type LucideIcon
} from "lucide-react";
import type { DemoRole } from "@/lib/types";
import { canAccessRoute } from "@/lib/permissions";
import {
  enterpriseMobileNavPriorityByRole,
  enterpriseNavGroups,
  enterpriseNavItems,
  enterpriseQuickActions,
  enterpriseWorkspaceCopyByPath,
  workspaceCopyForEnterpriseRoute,
  type EnterpriseRouteNavGroup
} from "@/lib/dam/enterprise-route-surface";

const shellIconRegistry = {
  Bell,
  Boxes,
  Clock3,
  Database,
  FileCheck2,
  FolderClock,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UploadCloud,
  UserCog
} satisfies Record<string, LucideIcon>;

type ShellIconKey = keyof typeof shellIconRegistry;

function iconForKey(icon: string): LucideIcon {
  return shellIconRegistry[icon as ShellIconKey] || Library;
}

export type DamShellNavGroup = EnterpriseRouteNavGroup;

export type DamShellNavItem = {
  label: string;
  mobileLabel?: string;
  href: string;
  activeHrefs?: string[];
  icon: LucideIcon;
  roles?: DemoRole[];
  description?: string;
  group: DamShellNavGroup;
  badge?: string;
};

function navItemFromManifest(item: typeof enterpriseNavItems[number] | typeof enterpriseQuickActions[number]): DamShellNavItem {
  return {
    label: item.label,
    mobileLabel: "mobileLabel" in item ? item.mobileLabel : undefined,
    href: item.href,
    activeHrefs: "activeHrefs" in item ? item.activeHrefs : undefined,
    icon: iconForKey(item.icon),
    roles: "roles" in item ? item.roles as DemoRole[] : undefined,
    description: item.description,
    group: item.group as DamShellNavGroup,
    badge: "badge" in item ? item.badge : undefined
  };
}

export const damShellNavItems: DamShellNavItem[] = enterpriseNavItems.map(navItemFromManifest);
export const damShellNavGroups: DamShellNavGroup[] = [...enterpriseNavGroups];

export function canSeeDamShellItem(item: DamShellNavItem, role: DemoRole) {
  if (item.roles && !item.roles.includes(role)) return false;
  return canAccessRoute(role, item.href);
}

export function damShellItemsForRole(role: DemoRole) {
  return damShellNavItems.filter((item) => canSeeDamShellItem(item, role));
}

export function canSeeDamShellGroup(group: DamShellNavGroup, role: DemoRole) {
  return damShellItemsForRole(role).some((item) => item.group === group);
}

export function getVisibleMobileNavItems(role: DemoRole, limit = 5) {
  const visibleItems = damShellItemsForRole(role).filter((item) => item.group !== "Governance" && item.group !== "Admin");
  const visibleByHref = new Map(visibleItems.map((item) => [item.href, item]));

  return enterpriseMobileNavPriorityByRole[role]
    .map((href) => visibleByHref.get(href))
    .filter((item): item is DamShellNavItem => Boolean(item))
    .slice(0, limit);
}

export const damShellQuickActions: DamShellNavItem[] = enterpriseQuickActions.map(navItemFromManifest);

export const damShellWorkspaceCopy: Record<string, { title: string; subtitle: string }> = enterpriseWorkspaceCopyByPath;

export function workspaceCopyForPath(pathname: string, search = "") {
  return workspaceCopyForEnterpriseRoute(pathname, search);
}
