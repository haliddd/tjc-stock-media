import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { decideAccess } from "@/lib/access-decisions";
import { routeAccessForPathname, routePathname } from "@/lib/dam/enterprise-route-surface";

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

export function canAccessRoute(role: DemoRole, route: string) {
  switch (routeAccessForPathname(routePathname(route))) {
    case "admin":
      return canAdmin(role);
    case "review":
      return canReview(role);
    case "upload":
      return canUpload(role);
    case "public":
    default:
      return true;
  }
}

export function canSeeAsset(role: DemoRole, asset: StockMediaAsset) {
  return decideAccess(role, "viewAsset", asset).allowed;
}

export function canDownloadApprovedCopy(role: DemoRole, asset: StockMediaAsset) {
  return decideAccess(role, "downloadApprovedCopy", asset).allowed;
}
