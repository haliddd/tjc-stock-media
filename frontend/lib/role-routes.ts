import type { DemoRole } from "@/lib/types";

const clientRoleSwitchEnabled = process.env.NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH === "1";

export function routeWithRole(path: string, role: DemoRole) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("#")) return path;
  if (!clientRoleSwitchEnabled) return path;

  const hashIndex = path.indexOf("#");
  const route = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  params.set("role", role);
  const queryString = params.toString();

  return `${pathname || "/"}${queryString ? `?${queryString}` : ""}${hash}`;
}
