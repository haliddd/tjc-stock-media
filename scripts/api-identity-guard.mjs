#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apiRoot = path.join(root, "frontend/app/api");
const handlerPattern = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\b/g;
const identityCalls = [
  "requestIdentity(",
  "createDamRouteSession(",
  "runReviewActionWorkflow(",
  "runApprovedDeliveryGate("
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

function functionBodyAt(source, startIndex) {
  const paramsOpenIndex = source.indexOf("(", startIndex);
  if (paramsOpenIndex === -1) return "";
  let parenDepth = 0;
  let paramsCloseIndex = -1;
  for (let index = paramsOpenIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth -= 1;
    if (parenDepth === 0) {
      paramsCloseIndex = index;
      break;
    }
  }
  if (paramsCloseIndex === -1) return "";
  const openIndex = source.indexOf("{", paramsCloseIndex);
  if (openIndex === -1) return "";
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex, index + 1);
  }
  return "";
}

const failures = [];
const routeFiles = walk(apiRoot);
const requestIdentitySource = fs.readFileSync(path.join(root, "frontend/lib/request-identity.ts"), "utf8");
const permissionsSource = fs.readFileSync(path.join(root, "frontend/lib/permissions.ts"), "utf8");

for (const fullPath of routeFiles) {
  const relativePath = path.relative(root, fullPath);
  const source = fs.readFileSync(fullPath, "utf8");
  for (const match of source.matchAll(handlerPattern)) {
    const method = match[1];
    const body = functionBodyAt(source, match.index || 0);
    const hasIdentitySeam = identityCalls.some((call) => body.includes(call));
    if (!hasIdentitySeam) {
      failures.push(`${relativePath} ${method} must resolve role through requestIdentity/createDamRouteSession or delegated workflow`);
    }
  }
  if (/\bnormalizeRole\b/.test(source)) {
    failures.push(`${relativePath} must not normalize roles directly; use requestIdentity/createDamRouteSession`);
  }
  if (/roles\.includes/.test(source)) {
    failures.push(`${relativePath} must not hand-roll route role allowlists; use permissions helpers`);
  }
  if (/function\s+can[A-Za-z0-9_]*\s*\(\s*role\s*:\s*(string|DemoRole)\s*\)/.test(source)) {
    failures.push(`${relativePath} must not define route-local role gates; add named capability helpers in frontend/lib/permissions.ts`);
  }
}

const rolePersistenceFiles = [
  "frontend/lib/audit-log.ts",
  "frontend/lib/beta-feedback.ts",
  { path: "frontend/lib/package-store.ts", helper: "normalizeContributingRoleWithFallback" },
  { path: "frontend/lib/saved-search-store.ts", helper: "normalizeContributingRoleWithFallback" },
  "frontend/lib/usage-analytics.ts"
];

for (const entry of rolePersistenceFiles) {
  const relativePath = typeof entry === "string" ? entry : entry.path;
  const helper = typeof entry === "string" ? "normalizeRoleWithFallback" : entry.helper;
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (!source.includes(helper)) {
    failures.push(`${relativePath} must normalize persisted roles through ${helper}`);
  }
  if (/value\s*===\s*"Contributor"\s*\|\|\s*value\s*===\s*"Reviewer"\s*\|\|\s*value\s*===\s*"DAM Admin"/.test(source)
    || /raw\.role\s*===\s*"Contributor"\s*\|\|\s*raw\.role\s*===\s*"Reviewer"\s*\|\|\s*raw\.role\s*===\s*"DAM Admin"/.test(source)) {
    failures.push(`${relativePath} must not hand-roll persisted role allowlists`);
  }
}

if (!permissionsSource.includes("function strongestRole")) {
  failures.push("frontend/lib/permissions.ts must expose strongestRole for role precedence");
}
if (!requestIdentitySource.includes("strongestRole")) {
  failures.push("frontend/lib/request-identity.ts must resolve SSO role precedence through strongestRole");
}
if (!requestIdentitySource.includes("const localFallbackRole = normalizeRole(explicitRole)")) {
  failures.push("frontend/lib/request-identity.ts must keep explicit roles confined to local beta fallback");
}
if (!requestIdentitySource.includes('highestTrustedRole(directRole, mappedRole(groups), highestRole(groups)) || "Viewer"')) {
  failures.push("frontend/lib/request-identity.ts must default trusted-header sessions without trusted role claims to Viewer");
}
if (!requestIdentitySource.includes("normalizeTrustedIdentityText") || !requestIdentitySource.includes("normalizeTrustedEmail") || !requestIdentitySource.includes("normalizePersistedDisplayText")) {
  failures.push("frontend/lib/request-identity.ts must sanitize trusted SSO identity headers before audit/storage use");
}
if (/highestTrustedRole\(directRole,\s*mappedRole\(groups\),\s*highestRole\(groups\)\)\s*\|\|\s*(fallbackRole|localFallbackRole)/.test(requestIdentitySource)) {
  failures.push("frontend/lib/request-identity.ts must not trust explicit URL/form roles when trusted SSO headers are enabled");
}
if (/roleRank|\.indexOf\(next\)\s*>\s*.*\.indexOf\(best\)/.test(requestIdentitySource)) {
  failures.push("frontend/lib/request-identity.ts must not hand-roll SSO role precedence ranking");
}
if (!requestIdentitySource.includes("productionRuntime()") || !requestIdentitySource.includes("production-client-role-ignored")) {
  failures.push("frontend/lib/request-identity.ts must ignore client role overrides in production");
}
if (!requestIdentitySource.includes("productionTrustedIdentityRequired") || !requestIdentitySource.includes("production:trusted-identity-missing")) {
  failures.push("frontend/lib/request-identity.ts must fail closed to Viewer when production trusted identity is missing");
}
if (!requestIdentitySource.includes("requestIsLocalhost(request) || localBetaRoleOverridesEnabled()")) {
  failures.push("frontend/lib/request-identity.ts must confine client role overrides to localhost or explicit beta mode");
}
if (!requestIdentitySource.includes('overridePolicy !== "download-gate"') || !requestIdentitySource.includes("client-role-disabled")) {
  failures.push("frontend/lib/request-identity.ts must centralize download-gate client role override policy");
}
if (!requestIdentitySource.includes("trusted-sso-authoritative")) {
  failures.push("frontend/lib/request-identity.ts must ignore client role overrides when trusted SSO headers are enabled");
}

if (failures.length) {
  console.error("API identity guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`API identity guard passed for ${routeFiles.length} routes.`);
