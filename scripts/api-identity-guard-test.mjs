#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/api-identity-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-api-identity-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

const fixtureFiles = [
  "frontend/lib/request-identity.ts",
  "frontend/lib/permissions.ts",
  "frontend/lib/audit-log.ts",
  "frontend/lib/beta-feedback.ts",
  "frontend/lib/package-store.ts",
  "frontend/lib/saved-search-store.ts",
  "frontend/lib/usage-analytics.ts",
  "frontend/middleware.ts",
  "frontend/components/dam/enterprise/AdminPage.tsx",
  "frontend/components/dam/enterprise/LibraryPage.tsx",
  "frontend/components/dam/enterprise/PackageBuilderPage.tsx",
  "frontend/components/dam/useDamApi.ts",
  "frontend/components/AdminPage.tsx",
  "frontend/components/ReviewPage.tsx",
  "frontend/components/AssetDetailPage.tsx",
  "frontend/components/LibraryPage.tsx",
  "frontend/components/CollectionsPage.tsx"
];

function copyRoutes(targetRoot) {
  fs.cpSync(path.join(root, "frontend/app/api"), path.join(targetRoot, "frontend/app/api"), { recursive: true });
}

function copyFixture(targetRoot) {
  copyRoutes(targetRoot);
  for (const relativePath of fixtureFiles) {
    const source = path.join(root, relativePath);
    const target = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyFixture(targetRoot);
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      API_IDENTITY_GUARD_ROOT: targetRoot
    },
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
    return;
  }
  const targetRoot = fixturePath(label);
  if (mutate) mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const targetRoot = fixturePath(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("route-query-role-read-regression", (targetRoot) => {
  const file = "frontend/app/api/review/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst badRole = request.nextUrl.searchParams.get("role");\n`);
});

expectFail("localhost-query-role-trust-regression", (targetRoot) => {
  const file = "frontend/lib/request-identity.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst badLocalTrust = requestIsLocalhost(request) || localBetaRoleOverridesEnabled();\n`);
});

expectFail("trusted-sso-fallback-regression", (targetRoot) => {
  const file = "frontend/lib/request-identity.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst badSsoFallback = highestTrustedRole(directRole, mappedRole(groups), highestRole(groups)) || fallbackRole;\n`);
});

expectFail("client-privileged-get-role-regression", (targetRoot) => {
  const file = "frontend/components/dam/useDamApi.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nparams.set("role", role);\n`);
});

expectFail("middleware-verified-header-strip-regression", (targetRoot) => {
  const file = "frontend/middleware.ts";
  write(targetRoot, file, read(targetRoot, file).replace(
    "requestHeaders.delete(BETA_SESSION_VERIFIED_HEADER)",
    "requestHeaders.delete(\"x-regression-missing-verified-strip\")"
  ));
});

expectFail("generic-production-role-header-regression", (targetRoot) => {
  const file = "frontend/lib/request-identity.ts";
  write(targetRoot, file, read(targetRoot, file).replace(
    'return productionRuntime() ? null : headers.get("x-tjc-role")',
    'return headers.get("x-tjc-role")'
  ));
});

if (failures.length) {
  console.error("API identity guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API identity guard self-test passed.");
