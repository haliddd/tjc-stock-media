import fs from "node:fs";
import path from "node:path";

let cachedRepoRoot = "";

function looksLikeRepoRoot(dir: string) {
  return fs.existsSync(path.join(dir, "Makefile")) && fs.existsSync(path.join(dir, "frontend", "package.json"));
}

function findRepoRoot(start: string) {
  let current = path.resolve(start);
  for (let depth = 0; depth < 6; depth += 1) {
    if (looksLikeRepoRoot(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start, "..");
}

export function repoRoot() {
  if (process.env.TJC_STOCK_MEDIA_ROOT) return path.resolve(process.env.TJC_STOCK_MEDIA_ROOT);
  cachedRepoRoot ||= findRepoRoot(process.cwd());
  return cachedRepoRoot;
}

export function writableRuntimeRoot() {
  if (process.env.VERCEL === "1") {
    return path.join(process.env.TMPDIR || "/tmp", "tjc-stock-media-runtime");
  }
  return repoRoot();
}

export function productionRuntime() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function resourceSpaceBaseUrl() {
  return process.env.RESOURCESPACE_BASE_URL || process.env.RS_BASE_URL || "http://localhost:8088";
}

export function normalizedResourceSpaceBaseUrl() {
  const raw = resourceSpaceBaseUrl().trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/g, "");
  } catch {
    return "";
  }
}

export function hasResourceSpaceApiConfig() {
  return Boolean(
    normalizedResourceSpaceBaseUrl()
    && (process.env.RESOURCESPACE_API_USER || process.env.RS_API_USER)
    && (process.env.RESOURCESPACE_API_KEY || process.env.RS_API_KEY)
  );
}

export function resourceSpaceApiUser() {
  return process.env.RESOURCESPACE_API_USER || process.env.RS_API_USER || "";
}

export function resourceSpaceApiKey() {
  return process.env.RESOURCESPACE_API_KEY || process.env.RS_API_KEY || "";
}

export function resourceSpaceWritebackEnabled() {
  return process.env.RESOURCESPACE_ENABLE_WRITEBACK === "1" && process.env.RESOURCESPACE_WRITEBACK_MODE === "live";
}

export function hasResourceSpaceFieldMapConfig() {
  return Boolean(process.env.RESOURCESPACE_FIELD_MAP_JSON);
}

export function hasS3DeliveryConfig() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_REGION && (process.env.S3_ACCESS_ROLE || process.env.AWS_ACCESS_KEY_ID));
}

export function hasGoogleSharedDriveConfig() {
  return Boolean(process.env.GOOGLE_SHARED_DRIVE_ID && process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export function hasSsoConfig() {
  return Boolean(process.env.SSO_PROVIDER && (process.env.SSO_CLIENT_ID || process.env.AUTH_CLIENT_ID));
}

export function trustedSsoHeadersEnabled() {
  return process.env.SSO_TRUSTED_HEADERS === "1" || process.env.SSO_PROVIDER === "cloudflare-access";
}

export function productionTrustedIdentityRequired() {
  return process.env.PRODUCTION_REQUIRE_TRUSTED_IDENTITY !== "0";
}

export function localBetaRoleOverridesEnabled() {
  if (productionRuntime()) return false;
  return process.env.PORTAL_ALLOW_BETA_ROLE_OVERRIDE === "1" || process.env.BETA_ROLE_OVERRIDE_ENABLED === "1";
}

export function hasUsageAnalyticsConfig() {
  return Boolean(process.env.PORTAL_USAGE_LOGGING === "1" || process.env.USAGE_ANALYTICS_DSN);
}

export function usageAnalyticsEnabled() {
  return process.env.PORTAL_USAGE_LOGGING === "1";
}

export function usageAnalyticsDbPath() {
  return process.env.USAGE_ANALYTICS_DB_PATH || "";
}

export function brandKitCollectionId(key: string) {
  return process.env[key] || "";
}

export function betaFeedbackEnabled() {
  return process.env.BETA_FEEDBACK_ENABLED !== "0";
}

export function betaTaskModeEnabled() {
  return process.env.BETA_TASK_MODE_ENABLED !== "0";
}

export function downloadGateDemoRolesAllowed() {
  return process.env.DOWNLOAD_GATE_ALLOW_DEMO_ROLES === "1";
}

export function hasVercelKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function hasVercelBlobConfig() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function betaFeedbackAttachmentsEnabled() {
  return process.env.BETA_FEEDBACK_ATTACHMENTS_ENABLED === "1";
}

export function runtimeStoreMode() {
  return process.env.RUNTIME_STORE || process.env.PORTAL_RUNTIME_STORE || "local-filesystem";
}

export function durableRuntimeStoreConfigured() {
  const mode = runtimeStoreMode();
  return (mode === "vercel-kv" && hasVercelKvConfig()) || mode === "external-durable";
}
