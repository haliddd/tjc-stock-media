import surface from "./enterprise-route-surface.json";
import type { DemoRole } from "@/lib/types";

export type EnterpriseRouteAccess = "public" | "upload" | "review" | "admin";
export type EnterpriseRouteId = typeof surface.routes[number]["id"];
export type EnterpriseRouteWorkspaceCopy = { title: string; subtitle: string };
export type EnterpriseRouteNavGroup = typeof surface.navGroups[number];
export type EnterpriseRouteNavItemManifest = typeof surface.navItems[number];
export type EnterpriseRouteQuickActionManifest = typeof surface.quickActions[number];

export const enterpriseRouteSurface = surface;
export const enterpriseRoutes = surface.routes;
export const enterpriseNavGroups = surface.navGroups;
export const enterpriseNavItems = surface.navItems;
export const enterpriseQuickActions = surface.quickActions;
export const enterpriseMobileNavPriorityByRole = surface.mobileNavPriorityByRole as Record<DemoRole, string[]>;
export const enterpriseWorkspaceCopyByPath = surface.workspaceCopyByPath as Record<string, EnterpriseRouteWorkspaceCopy>;

export function routePathname(route: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(route) || route.startsWith("#")) return route;
  const withoutHash = route.split("#", 1)[0] || "/";
  return withoutHash.split("?", 1)[0] || "/";
}

export function routeAccessForPathname(pathname: string): EnterpriseRouteAccess {
  const rule = surface.accessRules.find((candidate) => {
    if (candidate.prefix) return pathname === candidate.path || pathname.startsWith(`${candidate.path}/`);
    return pathname === candidate.path;
  });
  return (rule?.access ?? "public") as EnterpriseRouteAccess;
}

export function workspaceCopyForEnterpriseRoute(pathname: string, search = ""): EnterpriseRouteWorkspaceCopy {
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
