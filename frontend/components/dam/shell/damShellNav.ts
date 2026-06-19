"use client";

import {
  Clock3,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Library,
  MessageSquareText,
  ShieldAlert,
  UploadCloud,
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
  Clock3,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  Library,
  MessageSquareText,
  ShieldAlert,
  UploadCloud
} satisfies Record<string, LucideIcon>;

type ShellIconKey = keyof typeof shellIconRegistry;

function iconForKey(icon: string): LucideIcon {
  return shellIconRegistry[icon as ShellIconKey] || Library;
}

export type DamShellNavGroup = EnterpriseRouteNavGroup;

export type DamShellNavItem = {
  id: string;
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
  const optionalItem = item as {
    activeHrefs?: string[];
    badge?: string;
    mobileLabel?: string;
    roles?: DemoRole[];
  };
  const base: DamShellNavItem = {
    id: item.id,
    label: item.label,
    mobileLabel: optionalItem.mobileLabel,
    href: item.href,
    activeHrefs: optionalItem.activeHrefs,
    icon: iconForKey(item.icon),
    roles: optionalItem.roles,
    description: item.description,
    group: item.group as DamShellNavGroup,
    badge: optionalItem.badge
  };

  if (item.id === "library") {
    return {
      ...base,
      label: "Media Library",
      mobileLabel: "Library",
      description: "Browse church media with use guidance."
    };
  }

  if (item.id === "collections") {
    return {
      ...base,
      label: "Albums & Events",
      mobileLabel: "Albums",
      description: "Browse media by album, event, and ministry gathering."
    };
  }

  if (item.id === "myUploads") {
    return {
      ...base,
      label: "My Uploads",
      mobileLabel: "Uploads",
      href: "/recent-uploads",
      activeHrefs: ["/library?view=recent-uploads"],
      roles: ["Contributor"],
      description: "Track media you submitted for review."
    };
  }

  if (item.id === "myTasks") {
    return {
      ...base,
      label: "My Work",
      mobileLabel: "Work",
      href: "/my-tasks",
      activeHrefs: ["/tasks"],
      roles: ["Contributor", "Reviewer", "DAM Admin"],
      description: "Follow up on uploads, review questions, requests, and assigned work."
    };
  }

  if (item.id === "controlCenter") {
    return {
      ...base,
      label: "Support Zone",
      mobileLabel: "Support",
      description: "Admin-only readiness, identity, and blocked-operation checks."
    };
  }

  if (item.id === "help") {
    return {
      ...base,
      label: "Help Center",
      mobileLabel: "Help",
      description: "Find media-use guidance and review help."
    };
  }

  return base;
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
  const visibleItems = damShellItemsForRole(role).filter((item) => item.group !== "Admin" || role === "DAM Admin");
  const visibleByHref = new Map(visibleItems.map((item) => [item.href, item]));
  const priority = role === "Contributor"
    ? ["/library", "/upload", "/my-tasks", "/recent-uploads", "/requests"]
    : enterpriseMobileNavPriorityByRole[role];

  return priority
    .map((href) => visibleByHref.get(href))
    .filter((item): item is DamShellNavItem => Boolean(item))
    .slice(0, limit);
}

export const damShellQuickActions: DamShellNavItem[] = enterpriseQuickActions.map(navItemFromManifest);

function polishWorkspaceCopy(copy: { title: string; subtitle: string }) {
  const title = copy.title
    .replace("Browse Photos", "Media Library")
    .replace("Albums / Events", "Albums & Events")
    .replace("Album / Event", "Album & Event")
    .replace(/^Admin$/, "Support Zone")
    .replace(/^Help$/, "Help Center")
    .replace("Distribution Sets", "Delivery Sets");

  const subtitle = copy.subtitle
    .replace("approved church photos", "church media")
    .replace("Browse photos", "Browse media")
    .replace("Manage portal settings and review safety.", "Admin-only readiness, identity, and blocked-operation checks.")
    .replace("Deferred MVP draft area; collections remain the primary organization surface.", "Collections remain the primary organization surface.")
    .replace("Find help articles and media-use guidance.", "Find media-use guidance and review help.");

  return { title, subtitle };
}

export const damShellWorkspaceCopy: Record<string, { title: string; subtitle: string }> = Object.fromEntries(
  Object.entries(enterpriseWorkspaceCopyByPath).map(([path, copy]) => [path, polishWorkspaceCopy(copy)])
);

export function workspaceCopyForPath(pathname: string, search = "") {
  return polishWorkspaceCopy(workspaceCopyForEnterpriseRoute(pathname, search));
}
