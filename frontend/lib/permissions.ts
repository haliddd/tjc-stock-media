import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { decideAccess } from "@/lib/access-decisions";

export const roles: DemoRole[] = ["Viewer", "Contributor", "Reviewer", "DAM Admin"];
export type ReviewRole = "Reviewer" | "DAM Admin";
export type RoleFilter = DemoRole | "all";

export function strongestRole(current: DemoRole | null, next: DemoRole | null) {
  if (!next) return current;
  if (!current) return next;
  return roles.indexOf(next) > roles.indexOf(current) ? next : current;
}

export function isKnownRole(value: unknown): value is DemoRole {
  return roles.includes(value as DemoRole);
}

export function normalizeRole(value: string | null | undefined): DemoRole {
  if (isKnownRole(value)) {
    return value;
  }
  return "Viewer";
}

export function normalizeRoleWithFallback(value: unknown, fallback: DemoRole = "Viewer"): DemoRole {
  return isKnownRole(value) ? value : fallback;
}

export function normalizeRoleFilter(value: unknown): RoleFilter {
  return value === "all" || isKnownRole(value) ? value : "all";
}

export function normalizeContributingRoleWithFallback(value: unknown, fallback: DemoRole = "Contributor"): DemoRole {
  const role = normalizeRoleWithFallback(value, fallback);
  return canContribute(role) ? role : fallback;
}

export function normalizeReviewRoleWithFallback(value: unknown, fallback: ReviewRole = "Reviewer"): ReviewRole {
  const role = normalizeRoleWithFallback(value, fallback);
  return canReview(role) ? role as ReviewRole : fallback;
}

export function canReview(role: DemoRole) {
  return decideAccess(role, "reviewAsset").allowed;
}

export function canContribute(role: DemoRole) {
  return role === "Contributor" || canReview(role);
}

export function canAdmin(role: DemoRole) {
  return role === "DAM Admin";
}

export function canUpload(role: DemoRole) {
  return decideAccess(role, "uploadAsset").allowed;
}

export function canOpenResourceSpace(role: DemoRole) {
  return decideAccess(role, "viewResourceSpaceAdminLink").allowed;
}

function routePathname(route: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(route) || route.startsWith("#")) return route;
  const withoutHash = route.split("#", 1)[0] || "/";
  return withoutHash.split("?", 1)[0] || "/";
}

export function canAccessRoute(role: DemoRole, route: string) {
  const pathname = routePathname(route);
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return canAdmin(role);
  if (pathname === "/governance" || pathname.startsWith("/governance/")) return canAdmin(role);
  if (pathname === "/review" || pathname.startsWith("/review/")) return canReview(role);
  if (pathname === "/upload" || pathname.startsWith("/upload/")) return canUpload(role);
  if (pathname === "/recent-uploads" || pathname.startsWith("/recent-uploads/")) return canUpload(role);
  return true;
}

export function canSeeAsset(role: DemoRole, asset: StockMediaAsset) {
  return decideAccess(role, "viewAsset", asset).allowed;
}

export function canDownloadApprovedCopy(role: DemoRole, asset: StockMediaAsset) {
  return decideAccess(role, "downloadApprovedCopy", asset).allowed;
}
