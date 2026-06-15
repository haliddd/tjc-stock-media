import type { DemoRole } from "@/lib/types";
import { normalizeRole } from "@/lib/permissions";

export const BETA_SESSION_COOKIE = "tjc_beta_session";
export const BETA_SESSION_ROLE_HEADER = "x-tjc-beta-role";
export const BETA_SESSION_VERIFIED_HEADER = "x-tjc-beta-session-verified";
export const BETA_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type BetaPersona = {
  role: DemoRole;
  label: string;
  envName: string;
  description: string;
};

export const betaPersonas: BetaPersona[] = [
  {
    role: "Viewer",
    label: "Viewer",
    envName: "BETA_VIEWER_PASSWORD",
    description: "Library browsing with viewer-safe metadata and gated downloads."
  },
  {
    role: "Contributor",
    label: "Contributor",
    envName: "BETA_CONTRIBUTOR_PASSWORD",
    description: "Library, upload intake, and package drafts without review/admin controls."
  },
  {
    role: "Reviewer",
    label: "Reviewer",
    envName: "BETA_REVIEWER_PASSWORD",
    description: "Review queue and rights workflow where current gates allow it."
  },
  {
    role: "DAM Admin",
    label: "DAM Admin",
    envName: "BETA_ADMIN_PASSWORD",
    description: "Governance views and admin-only diagnostics behind existing gates."
  }
];

type BetaSessionPayload = {
  role: DemoRole;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function betaFlag(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function betaAuthEnabled() {
  return betaFlag(process.env.BETA_AUTH_ENABLED);
}

export function betaPasswordForRole(role: DemoRole) {
  const persona = betaPersonas.find((item) => item.role === role);
  return persona ? process.env[persona.envName] || "" : "";
}

export function betaPersonaConfigured(role: DemoRole) {
  return Boolean(betaPasswordForRole(role));
}

export function betaSessionSecretConfigured() {
  return Boolean(process.env.BETA_SESSION_SECRET || betaPersonas.every((item) => Boolean(process.env[item.envName])));
}

function sessionSecret() {
  const explicit = process.env.BETA_SESSION_SECRET;
  if (explicit) return explicit;
  const passwordBackedSecret = betaPersonas.map((item) => process.env[item.envName] || "").join("|");
  return passwordBackedSecret.replace(/\|/g, "") ? passwordBackedSecret : "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlEncodeText(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlDecodeText(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function hmacSignature(payload: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return diff === 0;
}

export function betaPasswordMatches(role: DemoRole, password: string) {
  const expected = betaPasswordForRole(role);
  if (!expected || !password) return false;
  return safeEqual(expected, password);
}

export function betaRoleFromInput(value: unknown) {
  return normalizeRole(typeof value === "string" ? value : null);
}

export async function createBetaSessionCookieValue(role: DemoRole, now = Date.now()) {
  const payload: BetaSessionPayload = {
    role,
    iat: now,
    exp: now + BETA_SESSION_MAX_AGE_SECONDS * 1000
  };
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await hmacSignature(encodedPayload);
  if (!signature) return "";
  return `${encodedPayload}.${signature}`;
}

export async function verifyBetaSessionCookieValue(value: string | undefined | null, now = Date.now()) {
  if (!value || !value.includes(".")) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;
  const expectedSignature = await hmacSignature(encodedPayload);
  if (!expectedSignature || !safeEqual(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecodeText(encodedPayload)) as Partial<BetaSessionPayload>;
    const role = parsed.role;
    if (!betaPersonas.some((item) => item.role === role)) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return {
      role: role as DemoRole,
      expiresAt: parsed.exp,
      issuedAt: typeof parsed.iat === "number" ? parsed.iat : null
    };
  } catch {
    return null;
  }
}

export function betaLoginPathForReturn(pathname: string, search = "") {
  const returnTo = `${pathname || "/"}${search || ""}`;
  return `/beta-login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function safeBetaReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/api/") || value.startsWith("/beta-login")) return "/";
  return value;
}
