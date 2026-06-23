#!/usr/bin/env node
const required = [
  "RESOURCESPACE_BASE_URL",
  "RESOURCESPACE_API_USER",
  "RESOURCESPACE_API_KEY",
  "BETA_AUTH_ENABLED",
  "BETA_SESSION_SECRET",
  "BETA_VIEWER_PASSWORD",
  "BETA_CONTRIBUTOR_PASSWORD",
  "BETA_REVIEWER_PASSWORD",
  "BETA_ADMIN_PASSWORD",
  "BETA_CHURCH_INVITE_CODES_JSON",
  "DOWNLOAD_GATE_ALLOW_DEMO_ROLES",
  "RESOURCESPACE_ENABLE_WRITEBACK",
  "RESOURCESPACE_WRITEBACK_MODE"
];

const forbiddenPublic = Object.keys(process.env).filter((name) =>
  /^NEXT_PUBLIC_/.test(name) && /(KEY|TOKEN|SECRET|PASSWORD|RESOURCESPACE|S3|AWS|KV|BLOB|MYSQL)/i.test(name)
);

const missing = required.filter((name) => !String(process.env[name] || "").trim());
const failures = [];

if (missing.length) failures.push(`Missing required env: ${missing.join(", ")}`);
if (forbiddenPublic.length) failures.push(`Secret-like NEXT_PUBLIC env names are forbidden: ${forbiddenPublic.join(", ")}`);
if (process.env.RESOURCESPACE_ENABLE_WRITEBACK !== "0") failures.push("RESOURCESPACE_ENABLE_WRITEBACK must be 0 for first cloud beta.");
if (process.env.RESOURCESPACE_WRITEBACK_MODE !== "queued") failures.push("RESOURCESPACE_WRITEBACK_MODE must be queued for first cloud beta.");
if (process.env.DOWNLOAD_GATE_ALLOW_DEMO_ROLES !== "0") failures.push("DOWNLOAD_GATE_ALLOW_DEMO_ROLES must be 0.");
if (process.env.PORTAL_ALLOW_BETA_ROLE_OVERRIDE && process.env.PORTAL_ALLOW_BETA_ROLE_OVERRIDE !== "0") failures.push("PORTAL_ALLOW_BETA_ROLE_OVERRIDE must be 0.");
if (process.env.NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH && process.env.NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH !== "0") failures.push("NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH must be 0.");
if (process.env.VERCEL_ENV === "production") failures.push("Cloud beta env check must not run against Production deployment.");

const durableFeedback = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const durablePendingWrites = process.env.PENDING_WRITES_STORE && process.env.PENDING_WRITES_STORE !== "local-filesystem";
const durableUploadIntake = process.env.UPLOAD_INTAKE_STORE && process.env.UPLOAD_INTAKE_STORE !== "local-filesystem";

const summary = {
  status: failures.length ? "NO-GO" : "GO",
  resourceSpaceBaseUrl: process.env.RESOURCESPACE_BASE_URL || "",
  writebackMode: process.env.RESOURCESPACE_WRITEBACK_MODE || "",
  durableFeedback,
  durablePendingWrites: Boolean(durablePendingWrites),
  durableUploadIntake: Boolean(durableUploadIntake),
  cloudStorageConfigured: Boolean(process.env.UPLOAD_STORAGE_PROVIDER && process.env.UPLOAD_STORAGE_BUCKET),
  failures
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);
