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
  RESOURCESPACE_ENABLE_WRITEBACK: "0",
  RESOURCESPACE_WRITEBACK_MODE: "queued",
  BETA_DATABASE_URL: "postgres://beta-db.example.invalid/tjc",
  PENDING_WRITES_STORE: "postgres",
  UPLOAD_INTAKE_STORE: "postgres",
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

expectPass("valid-preview-env");

expectFail("production-env", "must run against Vercel Preview", { VERCEL_ENV: "production", NODE_ENV: "production" });
expectFail("local-resourcespace", "must not point at local ResourceSpace", { RESOURCESPACE_BASE_URL: "http://localhost:8088" });
expectFail("live-writeback", "Live ResourceSpace writeback is not allowed", { RESOURCESPACE_ENABLE_WRITEBACK: "1", RESOURCESPACE_WRITEBACK_MODE: "live" });
expectFail("public-upload-storage", "UPLOAD_STORAGE_PUBLIC_READ must be 0", { UPLOAD_STORAGE_PUBLIC_READ: "1" });
expectFail("role-switch", "NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH must be 0", { NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH: "1" });
expectFail("missing-durable-db", "BETA_DATABASE_URL/POSTGRES_URL/DATABASE_URL missing", { BETA_DATABASE_URL: "", POSTGRES_URL: "", DATABASE_URL: "" });
expectFail("local-pending-store", "PENDING_WRITES_STORE must be postgres", { PENDING_WRITES_STORE: "local-filesystem" });
expectFail("placeholder-password", "BETA_ADMIN_PASSWORD still looks like a placeholder", { BETA_ADMIN_PASSWORD: "change-me" });

if (failures.length) {
  console.error("Cloud beta preview preflight self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Cloud beta preview preflight self-test passed.");
