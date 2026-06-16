import { NextRequest } from "next/server";
import { isKnownRole, normalizeRole, strongestRole } from "@/lib/permissions";
import { BETA_SESSION_CHURCH_LOCATION_HEADER, BETA_SESSION_ROLE_HEADER, BETA_SESSION_VERIFIED_HEADER, betaAuthEnabled } from "@/lib/beta-auth";
import { localBetaRoleOverridesEnabled, productionRuntime, productionTrustedIdentityRequired, trustedSsoHeadersEnabled } from "@/lib/env";
import { normalizePersistedDisplayText } from "@/lib/request-validation";
import type { DamUser, DemoRole } from "@/lib/types";

export const LOCAL_BETA_ROLE_OVERRIDE_HEADER = "x-tjc-local-beta-role";

type HeaderReader = { get(name: string): string | null };

export type DamSessionAdapter = "route" | "workflow" | "script-test";
export type ClientRoleOverridePolicy = "local-beta" | "download-gate";
export type ClientRoleOverrideSource = "query" | "body" | "script";

export type ClientRoleOverrideDecision = {
  requestedRole: string | null;
  role: string | null;
  source: ClientRoleOverrideSource | null;
  policy: ClientRoleOverridePolicy;
  allowed: boolean;
  ignored: boolean;
  denied: boolean;
  reasonCode: string | null;
};

export type RequestIdentityOptions = {
  explicitRole?: string | null;
  adapter?: DamSessionAdapter;
  overridePolicy?: ClientRoleOverridePolicy;
  overrideSource?: ClientRoleOverrideSource;
};

function requestIsLocalhost(request: NextRequest) {
  return ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
}

function downloadBodyDemoRolesAllowed() {
  return process.env.DOWNLOAD_GATE_ALLOW_DEMO_ROLES === "1" && !productionRuntime();
}

function downloadQueryDemoRolesAllowed(request: NextRequest) {
  if (productionRuntime()) return false;
  return downloadBodyDemoRolesAllowed() || localBetaRoleOverridesEnabled();
}

function normalizeIdentityOptions(explicitRoleOrOptions?: string | null | RequestIdentityOptions): Required<RequestIdentityOptions> {
  if (typeof explicitRoleOrOptions === "object" && explicitRoleOrOptions !== null) {
    return {
      explicitRole: explicitRoleOrOptions.explicitRole ?? null,
      adapter: explicitRoleOrOptions.adapter ?? "route",
      overridePolicy: explicitRoleOrOptions.overridePolicy ?? "local-beta",
      overrideSource: explicitRoleOrOptions.overrideSource ?? "query"
    };
  }
  return {
    explicitRole: explicitRoleOrOptions ?? null,
    adapter: "route",
    overridePolicy: "local-beta",
    overrideSource: "query"
  };
}

function verifiedBetaSessionRole(request: NextRequest) {
  const role = request.headers.get(BETA_SESSION_ROLE_HEADER);
  const verified = request.headers.get(BETA_SESSION_VERIFIED_HEADER) === "1";
  return betaAuthEnabled() && verified && isKnownRole(role) ? role : null;
}

export function localBetaRoleOverrideFromRequest(request: NextRequest) {
  return request.headers.get(LOCAL_BETA_ROLE_OVERRIDE_HEADER);
}

export function resolveClientRoleOverride(
  request: NextRequest,
  explicitRoleOrOptions?: string | null | RequestIdentityOptions
): ClientRoleOverrideDecision {
  const options = normalizeIdentityOptions(explicitRoleOrOptions);
  const betaRole = verifiedBetaSessionRole(request);
  if (betaRole) {
    return {
      requestedRole: typeof options.explicitRole === "string" && options.explicitRole.trim() ? options.explicitRole : null,
      role: betaRole,
      source: "query",
      policy: options.overridePolicy,
      allowed: false,
      ignored: true,
      denied: false,
      reasonCode: "beta-session-authoritative"
    };
  }
  const requestedRole = typeof options.explicitRole === "string" && options.explicitRole.trim()
    ? options.explicitRole
    : null;
  const base: ClientRoleOverrideDecision = {
    requestedRole,
    role: null,
    source: requestedRole ? options.overrideSource : null,
    policy: options.overridePolicy,
    allowed: false,
    ignored: false,
    denied: false,
    reasonCode: null
  };
  if (!requestedRole) return base;
  if (productionRuntime()) {
    return { ...base, ignored: true, reasonCode: "production-client-role-ignored" };
  }
  if (trustedSsoHeadersEnabled()) {
    return { ...base, ignored: true, reasonCode: "trusted-sso-authoritative" };
  }

  if (options.overridePolicy !== "download-gate") {
    if (localBetaRoleOverridesEnabled()) {
      return { ...base, role: requestedRole, allowed: true };
    }
    return { ...base, denied: true, reasonCode: "client-role-disabled" };
  }

  if (options.overrideSource === "query" && downloadQueryDemoRolesAllowed(request)) {
    return { ...base, role: requestedRole, allowed: true };
  }
  if (options.overrideSource === "body" && downloadBodyDemoRolesAllowed()) {
    return { ...base, role: requestedRole, allowed: true };
  }
  return { ...base, denied: true, reasonCode: "client-role-disabled" };
}

function roleFromTrustedValue(value?: string | null): DemoRole | null {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const has = (term: string) => tokens.includes(term);
  const phrase = (terms: string[]) => terms.every(has);
  if (tokens.some((token) => ["not", "no", "non", "deny", "denied", "disabled", "false"].includes(token))) return null;
  if (phrase(["dam", "admin"]) || phrase(["media", "admin"]) || normalized === "admin") return "DAM Admin";
  if (has("reviewer") || has("approver") || has("rights")) return "Reviewer";
  if (has("contributor") || has("uploader") || has("submitter")) return "Contributor";
  if (has("viewer") || has("member") || has("read")) return "Viewer";
  return null;
}

function cloudflareAccessHeadersPresent(headers: HeaderReader) {
  return Boolean(
    process.env.SSO_PROVIDER === "cloudflare-access"
    && headers.get("cf-access-jwt-assertion")
    && (headers.get("cf-access-authenticated-user-email") || headers.get("cf-access-user-email"))
  );
}

function trustedSsoHeadersTrusted(headers: HeaderReader) {
  if (!trustedSsoHeadersEnabled()) return false;
  if (!productionRuntime()) return true;
  return cloudflareAccessHeadersPresent(headers);
}

function trustedRoleGroups(headers: HeaderReader) {
  if (productionRuntime()) return headers.get("cf-access-groups") || "";
  return headers.get("cf-access-groups")
    || headers.get("x-auth-request-groups")
    || headers.get("x-tjc-groups")
    || "";
}

function trustedRoleClaim(headers: HeaderReader) {
  return productionRuntime() ? null : headers.get("x-tjc-role");
}

function trustedEmailHeader(headers: HeaderReader) {
  if (productionRuntime()) {
    return headers.get("cf-access-authenticated-user-email")
      || headers.get("cf-access-user-email")
      || undefined;
  }
  return headers.get("cf-access-authenticated-user-email")
    || headers.get("cf-access-user-email")
    || headers.get("x-auth-request-email")
    || undefined;
}

function trustedNameHeader(headers: HeaderReader) {
  if (productionRuntime()) return headers.get("cf-access-user");
  return headers.get("cf-access-user") || headers.get("x-auth-request-user");
}

export function trustedRoleFromHeaders(headers: HeaderReader): DemoRole | null {
  if (!trustedSsoHeadersTrusted(headers)) return null;
  const rawGroups = trustedRoleGroups(headers);
  const groups = rawGroups.split(/[,|;]/).map((item) => normalizeTrustedIdentityText(item, 80)).filter(Boolean);
  const directRole = roleFromTrustedValue(trustedRoleClaim(headers));
  return highestTrustedRole(directRole, mappedRole(groups), highestRole(groups)) || "Viewer";
}

function highestRole(values: string[]) {
  return values.reduce<DemoRole | null>((best, value) => {
    const next = roleFromTrustedValue(value);
    return strongestRole(best, next);
  }, null);
}

function parseRoleMap() {
  const raw = process.env.SSO_ROLE_MAP_JSON;
  if (!raw) return {} as Record<string, DemoRole>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key.toLowerCase().trim(), normalizeRole(String(value))] as const)
        .filter(([key]) => Boolean(key))
    );
  } catch {
    return {};
  }
}

function highestTrustedRole(...roles: Array<DemoRole | null>) {
  return roles.reduce<DemoRole | null>((best, next) => strongestRole(best, next), null);
}

function normalizeTrustedIdentityText(value: string | null | undefined, max = 120) {
  return normalizePersistedDisplayText(value, max);
}

function normalizeTrustedEmail(value: string | null | undefined) {
  const email = normalizeTrustedIdentityText(value, 254).toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email) ? email : undefined;
}

function mappedRole(groups: string[]) {
  const map = parseRoleMap();
  return groups.reduce<DemoRole | null>((best, group) => {
    const next = map[group.toLowerCase()];
    return strongestRole(best, next || null);
  }, null);
}

export function requestIdentity(request: NextRequest, explicitRoleOrOptions?: string | null | RequestIdentityOptions): DamUser {
  const betaRole = verifiedBetaSessionRole(request);
  if (betaRole) {
    const churchLocation = normalizeTrustedIdentityText(request.headers.get(BETA_SESSION_CHURCH_LOCATION_HEADER), 80);
    return {
      id: `internal-beta:${betaRole}`,
      name: `${betaRole} beta persona`,
      role: betaRole,
      team: churchLocation || undefined,
      sourceSystem: "local-beta"
    };
  }

  const override = resolveClientRoleOverride(request, explicitRoleOrOptions);
  const explicitRole = override.role;
  const headers = request.headers;
  const localFallbackRole = normalizeRole(explicitRole);
  if (!trustedSsoHeadersTrusted(headers)) {
    if (productionRuntime() && productionTrustedIdentityRequired()) {
      return {
        id: "production:trusted-identity-missing",
        name: "Trusted identity missing",
        role: "Viewer",
        sourceSystem: "local-beta"
      };
    }
    return {
      id: `local-beta:${localFallbackRole}`,
      name: localFallbackRole,
      role: localFallbackRole,
      sourceSystem: "local-beta"
    };
  }

  const email = trustedEmailHeader(headers);
  const trustedEmail = normalizeTrustedEmail(email);
  const rawGroups = trustedRoleGroups(headers);
  const groups = rawGroups.split(/[,|;]/).map((item) => normalizeTrustedIdentityText(item, 80)).filter(Boolean);
  const role = trustedRoleFromHeaders(headers) || "Viewer";
  const trustedName = normalizeTrustedIdentityText(trustedNameHeader(headers), 120);

  return {
    id: trustedEmail ? `sso:${trustedEmail}` : `sso:${role}`,
    name: trustedName || trustedEmail || role,
    email: trustedEmail,
    role,
    team: groups.join(", ") || undefined,
    sourceSystem: "sso"
  };
}
