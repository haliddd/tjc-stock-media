import surface from "./enterprise-route-surface.json";
import type { DemoRole } from "@/lib/types";

export type EnterpriseRouteAccess = "public" | "upload" | "review" | "admin";
export type EnterpriseRouteId = typeof surface.routes[number]["id"];
export type EnterpriseRouteWorkspaceCopy = { title: string; subtitle: string };
export type EnterpriseRouteNavGroup = typeof surface.navGroups[number];
export type EnterpriseRouteNavItemManifest = typeof surface.navItems[number];
export type EnterpriseRouteQuickActionManifest = typeof surface.quickActions[number];

type MutableEnterpriseRouteNavItem = Omit<EnterpriseRouteNavItemManifest, "roles"> & {
  activeHrefs?: string[];
  badge?: string;
  mobileLabel?: string;
  roles?: DemoRole[];
};

function normalizeNavItem(item: EnterpriseRouteNavItemManifest): MutableEnterpriseRouteNavItem {
  const optionalItem = item as EnterpriseRouteNavItemManifest & { roles?: string[] };
  const base = { ...item } as MutableEnterpriseRouteNavItem;
  if (optionalItem.roles) base.roles = optionalItem.roles as DemoRole[];

  if (item.id === "collections") {
    return {
      ...base,
      label: "Albums / Events",
      mobileLabel: "Albums",
      description: "Browse photos by album, event, and ministry gathering."
    };
  }

  if (item.id === "myUploads" || item.id === "recentUploads") {
    return {
      ...base,
      label: "My Uploads",
      mobileLabel: "Uploads",
      href: "/recent-uploads",
      activeHrefs: ["/library?view=recent-uploads"],
      roles: ["Contributor"] as DemoRole[],
      description: "Track photos you submitted for review."
    };
  }

  if (item.id === "myTasks") {
    return {
      ...base,
      label: "My Work",
      mobileLabel: "Work",
      href: "/my-tasks",
      activeHrefs: ["/tasks"],
      roles: ["Reviewer", "DAM Admin"] as DemoRole[],
      description: "Follow up on assigned uploads, reviews, and requests."
    };
  }

  return base;
}

const normalizedNavItems = surface.navItems.map(normalizeNavItem);

const normalizedMobileNavPriorityByRole: Record<DemoRole, string[]> = {
  Viewer: ["/library", "/collections", "/requests", "/help"],
  Contributor: ["/library", "/collections", "/upload", "/recent-uploads", "/requests"],
  Reviewer: ["/library", "/collections", "/upload", "/review", "/my-tasks"],
  "DAM Admin": ["/library", "/collections", "/upload", "/review", "/my-tasks"]
};

const normalizedWorkspaceCopyByPath: Record<string, EnterpriseRouteWorkspaceCopy> = {
  ...(surface.workspaceCopyByPath as Record<string, EnterpriseRouteWorkspaceCopy>),
  "/collections": { title: "Albums / Events", subtitle: "Browse photos by album, event, and ministry gathering." },
  "/my-tasks": { title: "My Work", subtitle: "Follow up on assigned uploads, reviews, and requests." },
  "/tasks": { title: "My Work", subtitle: "Follow up on assigned uploads, reviews, and requests." },
  "/recent-uploads": { title: "My Uploads", subtitle: "Track photos you submitted for review." }
};

export const enterpriseRouteSurface = {
  ...surface,
  navItems: normalizedNavItems,
  mobileNavPriorityByRole: normalizedMobileNavPriorityByRole,
  workspaceCopyByPath: normalizedWorkspaceCopyByPath
};
export const enterpriseRoutes = surface.routes;
export const enterpriseNavGroups = surface.navGroups;
export const enterpriseNavItems = normalizedNavItems;
export const enterpriseQuickActions = surface.quickActions;
export const enterpriseMobileNavPriorityByRole = normalizedMobileNavPriorityByRole;
export const enterpriseWorkspaceCopyByPath = normalizedWorkspaceCopyByPath;

export function routePathname(route: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(route) || route.startsWith("#")) return route;
  const withoutHash = route.split("#", 1)[0] || "/";
  return withoutHash.split("?", 1)[0] || "/";
}

export function routeAccessForPathname(pathname: string): EnterpriseRouteAccess {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/governance" || pathname.startsWith("/governance/")) return "admin";
  if (pathname === "/packages" || pathname.startsWith("/packages/")) return "admin";
  if (pathname === "/distribution-sets" || pathname.startsWith("/distribution-sets/")) return "admin";
  if (pathname === "/review" || pathname.startsWith("/review/")) return "review";
  if (pathname === "/my-tasks" || pathname.startsWith("/my-tasks/")) return "public";
  if (pathname === "/tasks" || pathname.startsWith("/tasks/")) return "public";
  if (pathname === "/upload" || pathname.startsWith("/upload/")) return "upload";
  if (pathname === "/recent-uploads" || pathname.startsWith("/recent-uploads/")) return "upload";

  const rule = surface.accessRules.find((candidate) => {
    if (candidate.prefix) return pathname === candidate.path || pathname.startsWith(`${candidate.path}/`);
    return pathname === candidate.path;
  });
  return (rule?.access ?? "public") as EnterpriseRouteAccess;
}

export function workspaceCopyForEnterpriseRoute(pathname: string, search = ""): EnterpriseRouteWorkspaceCopy {
  if (pathname.startsWith("/collections/")) {
    return { title: "Album / Event", subtitle: "Browse event photos and album details." };
  }

  const params = new URLSearchParams(search);
  const queryOverride = surface.workspaceQueryOverrides.find((override) => (
    override.pathname === pathname && params.get(override.param) === override.value
  ));
  if (queryOverride) {
    return { title: queryOverride.title, subtitle: queryOverride.subtitle };
  }

  const prefixCopy = surface.workspacePrefixCopy.find((copy) => pathname.startsWith(copy.prefix));
  if (prefixCopy) {
    return { title: prefixCopy.title, subtitle: prefixCopy.subtitle };
  }

  return enterpriseWorkspaceCopyByPath[pathname] || enterpriseWorkspaceCopyByPath["/"];
}
