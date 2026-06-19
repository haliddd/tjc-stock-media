export type DamRouteActiveInput = {
  pathname: string;
  currentSearch?: string;
  currentHash?: string;
  href: string;
  activeHrefs?: string[];
};

export const damRouteIdentityPaths = [
  "/requests",
  "/my-tasks",
  "/tasks",
  "/help",
  "/guide",
  "/recent-uploads",
  "/governance",
  "/governance/rights-consent",
  "/governance/metadata-health",
  "/governance/policy-center",
  "/governance/audit-log",
  "/governance/integrations",
  "/admin",
  "/admin/users",
  "/admin/roles",
  "/admin/taxonomy",
  "/admin/settings"
] as const;

const exactTopLevelRoutes = new Set(["/admin", "/governance"]);

function hasParams(params: URLSearchParams) {
  return Array.from(params.keys()).length > 0;
}

function normalizedHash(hash = "") {
  return hash.replace(/^#/, "");
}

function currentQueryBelongsToSiblingNav(pathname: string, params: URLSearchParams) {
  if (pathname === "/library" && params.get("view") === "recent-uploads") {
    return true;
  }
  return false;
}

function routeCandidateIsActive(pathname: string, currentSearch: string, currentHash: string, href: string) {
  const target = new URL(href, "http://tjc.local");
  const targetPathname = target.pathname || "/";
  const pathMatches = targetPathname === "/"
    ? pathname === "/"
    : exactTopLevelRoutes.has(targetPathname)
      ? pathname === targetPathname
      : pathname === targetPathname || pathname.startsWith(`${targetPathname}/`);

  if (!pathMatches) return false;

  const targetParams = new URLSearchParams(target.search);
  const currentParams = new URLSearchParams(currentSearch);
  targetParams.delete("role");
  currentParams.delete("role");

  if (hasParams(targetParams)) {
    for (const [key, value] of targetParams) {
      if (currentParams.get(key) !== value) return false;
    }
  } else if (hasParams(currentParams) && currentQueryBelongsToSiblingNav(targetPathname, currentParams)) {
    return false;
  }

  const targetHash = normalizedHash(target.hash);
  const activeHash = normalizedHash(currentHash);
  if (targetHash) return activeHash === targetHash;
  return true;
}

export function isDamShellRouteActive({
  pathname,
  currentSearch = "",
  currentHash = "",
  href,
  activeHrefs = []
}: DamRouteActiveInput) {
  return [href, ...activeHrefs].some((candidate) => routeCandidateIsActive(pathname, currentSearch, currentHash, candidate));
}
