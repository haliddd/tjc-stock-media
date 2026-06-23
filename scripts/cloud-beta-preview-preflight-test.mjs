#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/cloud-beta-preview-preflight.mjs");
const failures = [];

const baseEnv = {
  PATH: process.env.PATH || "",
  VERCEL_ENV: "preview",
  RESOURCESPACE_BASE_URL: "https://dam-staging.tjc.org",
  RESOURCESPACE_API_USER: "portal-beta-api",
  RESOURCESPACE_API_KEY: "rs-api-key-for-test",
  RESOURCESPACE_FIELD_MAP_JSON: JSON.stringify({ status: 8, usageScope: 9, reviewer: 10, reviewedDate: 11 }),
  RESOURCESPACE_DEFAULT_COLLECTION_ID: "100",
  RESOURCESPACE_UPLOAD_COLLECTION_ID: "101",
  RESOURCESPACE_REVIEW_COLLECTION_ID: "102",
  RESOURCESPACE_ENABLE_WRITEBACK: "0",
  RESOURCESPACE_WRITEBACK_MODE: "queued",
  BETA_DATABASE_URL: "postgres://beta-db.example.invalid/tjc",
  PENDING_WRITES_STORE: "vercel-kv",
  UPLOAD_INTAKE_STORE: "postgres",
  KV_REST_API_URL: "https://kv.example.invalid",
  KV_REST_API_TOKEN: "kv-token-for-test",
  BETA_FEEDBACK_STORE: "vercel-kv",
  BETA_FEEDBACK_ENABLED: "1",
  UPLOAD_STORAGE_PROVIDER: "r2",
  UPLOAD_STORAGE_BUCKET: "tjc-beta-intake",
  UPLOAD_STORAGE_REGION: "auto",
  UPLOAD_STORAGE_ACCESS_KEY_ID: "upload-access-key",
  UPLOAD_STORAGE_SECRET_ACCESS_KEY: "upload-secret-key",
  UPLOAD_STORAGE_PUBLIC_READ: "0",
  BETA_AUTH_ENABLED: "true",
  BETA_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  BETA_VIEWER_PASSWORD: "viewer-pass-2026",
  BETA_CONTRIBUTOR_PASSWORD: "contributor-pass-2026",
  BETA_REVIEWER_PASSWORD: "reviewer-pass-2026",
  BETA_ADMIN_PASSWORD: "admin-pass-2026",
  PORTAL_ALLOW_BETA_ROLE_OVERRIDE: "0",
  BETA_ROLE_OVERRIDE_ENABLED: "0",
  NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH: "0",
  DOWNLOAD_GATE_ALLOW_DEMO_ROLES: "0",
  DOWNLOAD_GATE_REQUIRE_APPROVED_COPY: "true",
  SOURCE_ORIGINAL_DOWNLOADS_ENABLED: "0"
};

function run(label, overrides = {}) {
  const result = spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: { ...baseEnv, ...overrides },
    encoding: "utf8"
  });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    payload = { raw: result.stdout };
  }
  return { label, result, payload };
}

function expectPass(label, overrides) {
  const { result, payload } = run(label, overrides);
  if (result.status !== 0 || payload.status !== "GO") {
    failures.push(`${label} should pass:\n${result.stdout}\n${result.stderr}`);
  }
}

function expectFail(label, expectedText, overrides) {
  const { result, payload } = run(label, overrides);
  const text = JSON.stringify(payload);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
  if (!text.includes(expectedText)) failures.push(`${label} missing failure text ${expectedText}:\n${result.stdout}`);
}

expectFail("valid-preview-shape-blocked-by-upload-intake-adapter", "UPLOAD_INTAKE_STORE=postgres is required but not implemented", {});

expectFail("production-env", "must run against Vercel Preview", { VERCEL_ENV: "production", NODE_ENV: "production" });
expectFail("local-resourcespace", "must not point at local ResourceSpace", { RESOURCESPACE_BASE_URL: "http://localhost:8088" });
expectFail("missing-field-map", "RESOURCESPACE_FIELD_MAP_JSON missing", { RESOURCESPACE_FIELD_MAP_JSON: "" });
expectFail("invalid-field-map", "RESOURCESPACE_FIELD_MAP_JSON must be valid JSON", { RESOURCESPACE_FIELD_MAP_JSON: "not-json" });
expectFail("live-writeback", "Live ResourceSpace writeback is not allowed", { RESOURCESPACE_ENABLE_WRITEBACK: "1", RESOURCESPACE_WRITEBACK_MODE: "live" });
expectFail("public-upload-storage", "UPLOAD_STORAGE_PUBLIC_READ must be 0", { UPLOAD_STORAGE_PUBLIC_READ: "1" });
expectFail("role-switch", "NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH must be 0", { NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH: "1" });
expectFail("missing-durable-db", "BETA_DATABASE_URL/POSTGRES_URL/DATABASE_URL missing", { BETA_DATABASE_URL: "", POSTGRES_URL: "", DATABASE_URL: "" });
expectFail("local-pending-store", "PENDING_WRITES_STORE must be postgres or vercel-kv", { PENDING_WRITES_STORE: "local-filesystem" });
expectFail("kv-pending-missing-kv", "KV_REST_API_URL and KV_REST_API_TOKEN are required", { PENDING_WRITES_STORE: "vercel-kv", KV_REST_API_URL: "", KV_REST_API_TOKEN: "" });
expectFail("postgres-pending-not-implemented", "PENDING_WRITES_STORE=postgres is not implemented", { PENDING_WRITES_STORE: "postgres" });
expectFail("postgres-feedback-not-implemented", "BETA_FEEDBACK_STORE=postgres is not implemented", { BETA_FEEDBACK_STORE: "postgres" });
expectFail("resourcespace-intake-upload-not-proven", "UPLOAD_STORAGE_PROVIDER=resourcespace-intake is not implemented", { UPLOAD_STORAGE_PROVIDER: "resourcespace-intake", UPLOAD_STORAGE_BUCKET: "", UPLOAD_STORAGE_REGION: "", UPLOAD_STORAGE_ACCESS_KEY_ID: "", UPLOAD_STORAGE_SECRET_ACCESS_KEY: "" });
expectFail("placeholder-password", "BETA_ADMIN_PASSWORD still looks like a placeholder", { BETA_ADMIN_PASSWORD: "change-me" });

if (failures.length) {
  console.error("Cloud beta preview preflight self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Cloud beta preview preflight self-test passed.");
