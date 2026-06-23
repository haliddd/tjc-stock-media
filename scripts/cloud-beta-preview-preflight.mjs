#!/usr/bin/env node

const env = process.env;
const failures = [];
const warnings = [];

function value(name) {
  return String(env[name] || "").trim();
}

function enabled(name) {
  return /^(1|true|yes|on)$/i.test(value(name));
}

function disabled(name) {
  const raw = value(name);
  return raw === "" || /^(0|false|no|off)$/i.test(raw);
}

function requirePresent(name, reason) {
  if (!value(name)) failures.push(`${name} missing: ${reason}`);
}

function requireDisabled(name, reason) {
  if (!disabled(name)) failures.push(`${name} must be disabled: ${reason}`);
}

function requireExact(name, expected, reason) {
  if (value(name) !== expected) failures.push(`${name} must be ${expected}: ${reason}`);
}

function hasAny(names) {
  return names.some((name) => Boolean(value(name)));
}

function redactedState(name) {
  return value(name) ? "set" : "missing";
}

function validateHttpsStagingUrl() {
  const raw = value("RESOURCESPACE_BASE_URL") || value("RS_BASE_URL");
  if (!raw) {
    failures.push("RESOURCESPACE_BASE_URL missing: Vercel Preview must connect to ResourceSpace Cloud/Staging.");
    return;
  }
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") failures.push("RESOURCESPACE_BASE_URL must use HTTPS for cloud beta.");
    if (["localhost", "127.0.0.1", "::1"].includes(host) || host.endsWith(".local")) {
      failures.push("RESOURCESPACE_BASE_URL must not point at local ResourceSpace for cloud beta.");
    }
    if (url.username || url.password || url.search || url.hash) {
      failures.push("RESOURCESPACE_BASE_URL must not contain credentials, query, or fragment.");
    }
  } catch {
    failures.push("RESOURCESPACE_BASE_URL must be a valid HTTPS URL.");
  }
}

function validateSecretShape(name, minLength = 12) {
  const raw = value(name);
  if (!raw) {
    failures.push(`${name} missing.`);
    return;
  }
  if (raw.length < minLength) failures.push(`${name} looks too short for cloud beta.`);
  if (/change-me|replace|example|password|secret|todo/i.test(raw)) failures.push(`${name} still looks like a placeholder.`);
}

function validateUploadStorage() {
  const provider = value("UPLOAD_STORAGE_PROVIDER").toLowerCase();
  if (!["s3", "r2", "vercel-blob"].includes(provider)) {
    failures.push("UPLOAD_STORAGE_PROVIDER must be s3, r2, or vercel-blob for cloud beta.");
    return;
  }
  requireExact("UPLOAD_STORAGE_PUBLIC_READ", "0", "uploaded beta intake files must stay private.");
  if (provider === "vercel-blob") {
    requirePresent("BLOB_READ_WRITE_TOKEN", "Vercel Blob upload staging selected.");
    return;
  }
  requirePresent("UPLOAD_STORAGE_BUCKET", "private upload staging bucket required.");
  requirePresent("UPLOAD_STORAGE_REGION", "private upload staging region required.");
  if (!hasAny(["UPLOAD_STORAGE_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"])) {
    failures.push("UPLOAD_STORAGE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID missing for private upload staging.");
  }
  if (!hasAny(["UPLOAD_STORAGE_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"])) {
    failures.push("UPLOAD_STORAGE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY missing for private upload staging.");
  }
}

function validateDurableStores() {
  if (!hasAny(["BETA_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"])) {
    failures.push("BETA_DATABASE_URL/POSTGRES_URL/DATABASE_URL missing: pending writes and upload intake need durable storage.");
  }
  const pendingMode = value("PENDING_WRITES_STORE");
  if (!["postgres", "vercel-kv"].includes(pendingMode)) {
    failures.push("PENDING_WRITES_STORE must be postgres or vercel-kv: cloud beta review decisions must not use local filesystem.");
  }
  if (pendingMode === "vercel-kv" && (!value("KV_REST_API_URL") || !value("KV_REST_API_TOKEN"))) {
    failures.push("KV_REST_API_URL and KV_REST_API_TOKEN are required when PENDING_WRITES_STORE=vercel-kv.");
  }
  requireExact("UPLOAD_INTAKE_STORE", "postgres", "cloud beta upload intake metadata must not use local filesystem.");
  if (!hasAny(["KV_REST_API_URL", "BETA_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"])) {
    failures.push("Feedback durable storage missing: configure KV or shared beta DB before inviting testers.");
  }
}

function validateBetaAuth() {
  requireExact("BETA_AUTH_ENABLED", "true", "cloud beta must require persona login.");
  validateSecretShape("BETA_SESSION_SECRET", 32);
  for (const name of ["BETA_VIEWER_PASSWORD", "BETA_CONTRIBUTOR_PASSWORD", "BETA_REVIEWER_PASSWORD", "BETA_ADMIN_PASSWORD"]) {
    validateSecretShape(name, 10);
  }
  requireDisabled("PORTAL_ALLOW_BETA_ROLE_OVERRIDE", "query/local role switching must not unlock cloud roles.");
  requireDisabled("BETA_ROLE_OVERRIDE_ENABLED", "query/local role switching must not unlock cloud roles.");
  requireExact("NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH", "0", "cloud preview must not show local role switch.");
}

function validateResourceSpace() {
  validateHttpsStagingUrl();
  requirePresent("RESOURCESPACE_API_USER", "restricted portal API user required.");
  requirePresent("RESOURCESPACE_API_KEY", "restricted portal API key required.");
  requireDisabled("RESOURCESPACE_ENABLE_WRITEBACK", "first cloud beta keeps writeback queued.");
  requireExact("RESOURCESPACE_WRITEBACK_MODE", "queued", "first cloud beta must queue reviewer writes.");
}

function validateDownloadGate() {
  requireExact("DOWNLOAD_GATE_ALLOW_DEMO_ROLES", "0", "cloud beta must not trust demo role overrides for downloads.");
  requireExact("DOWNLOAD_GATE_REQUIRE_APPROVED_COPY", "true", "downloads require approved copy gate.");
  requireExact("SOURCE_ORIGINAL_DOWNLOADS_ENABLED", "0", "source/original downloads must stay disabled.");
}

if (value("VERCEL_ENV") === "production" || value("NODE_ENV") === "production" && value("VERCEL_ENV") !== "preview") {
  failures.push("Cloud beta preflight must run against Vercel Preview/staging, not production.");
}
if (value("VERCEL_ENV") && value("VERCEL_ENV") !== "preview") {
  failures.push("VERCEL_ENV must be preview for team beta preflight.");
}

validateResourceSpace();
validateDurableStores();
validateUploadStorage();
validateBetaAuth();
validateDownloadGate();

if (enabled("RESOURCESPACE_ENABLE_WRITEBACK") || value("RESOURCESPACE_WRITEBACK_MODE") === "live") {
  failures.push("Live ResourceSpace writeback is not allowed for first 10-person cloud beta.");
}
if (enabled("UPLOAD_STORAGE_PUBLIC_READ")) {
  failures.push("UPLOAD_STORAGE_PUBLIC_READ must stay off.");
}
if (enabled("NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH")) {
  failures.push("NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH must stay off for cloud beta.");
}

const summary = {
  status: failures.length ? "NO-GO" : "GO",
  checkedAt: new Date().toISOString(),
  environment: value("VERCEL_ENV") || "local-shell",
  resourceSpaceBaseUrl: value("RESOURCESPACE_BASE_URL") ? "set" : redactedState("RS_BASE_URL"),
  resourceSpaceWritebackMode: value("RESOURCESPACE_WRITEBACK_MODE") || "missing",
  pendingWritesStore: value("PENDING_WRITES_STORE") || "missing",
  uploadIntakeStore: value("UPLOAD_INTAKE_STORE") || "missing",
  uploadStorageProvider: value("UPLOAD_STORAGE_PROVIDER") || "missing",
  betaDatabase: hasAny(["BETA_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"]) ? "set" : "missing",
  feedbackStore: hasAny(["KV_REST_API_URL", "BETA_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"]) ? "set" : "missing",
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) process.exit(1);
