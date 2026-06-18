#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.env.API_IDENTITY_GUARD_ROOT || process.cwd();
const apiRoot = path.join(root, "frontend/app/api");
const handlerPattern = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\b/g;
const identityCalls = [
  "requestIdentity(",
  "createDamRouteSession(",
  "runReviewActionWorkflow(",
  "runApprovedDeliveryGate("
];
const roleQueryReadPattern = /(?:request\.nextUrl\.searchParams|params|searchParams)\.get\(["']role["']\)/;
const allowedRoleQueryConsumers = [
  "requestIdentity(",
  "createDamRouteSession(",
  "runApprovedDeliveryGate(",
  "explicitRole:"
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
const middlewareSource = fs.readFileSync(path.join(root, "frontend/middleware.ts"), "utf8");
const enterpriseAdminSource = fs.readFileSync(path.join(root, "frontend/components/dam/enterprise/AdminPage.tsx"), "utf8");
const enterpriseLibrarySource = fs.readFileSync(path.join(root, "frontend/components/dam/enterprise/LibraryPage.tsx"), "utf8");
const enterprisePackageSource = fs.readFileSync(path.join(root, "frontend/components/dam/enterprise/PackageBuilderPage.tsx"), "utf8");
const damApiClientSource = fs.readFileSync(path.join(root, "frontend/components/dam/useDamApi.ts"), "utf8");
const legacyAdminSource = fs.readFileSync(path.join(root, "frontend/components/AdminPage.tsx"), "utf8");
const legacyReviewSource = fs.readFileSync(path.join(root, "frontend/components/ReviewPage.tsx"), "utf8");
const legacyAssetDetailSource = fs.readFileSync(path.join(root, "frontend/components/AssetDetailPage.tsx"), "utf8");
const legacyLibrarySource = fs.readFileSync(path.join(root, "frontend/components/LibraryPage.tsx"), "utf8");
const legacyCollectionsSource = fs.readFileSync(path.join(root, "frontend/components/CollectionsPage.tsx"), "utf8");

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
  source.split("\n").forEach((line, index) => {
    if (!roleQueryReadPattern.test(line)) return;
    if (allowedRoleQueryConsumers.some((consumer) => line.includes(consumer))) return;
    failures.push(`${relativePath}:${index + 1} role query reads must feed requestIdentity/createDamRouteSession/runApprovedDeliveryGate directly`);
  });
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
if (requestIdentitySource.includes("requestIsLocalhost(request) || localBetaRoleOverridesEnabled()")
  || requestIdentitySource.includes("downloadBodyDemoRolesAllowed() || requestIsLocalhost(request)")
  || /if\s*\(\s*requestIsLocalhost\(request\)\s*\)/.test(requestIdentitySource)) {
  failures.push("frontend/lib/request-identity.ts must not trust localhost query roles without explicit server-only override env");
}
if (!requestIdentitySource.includes("if (localBetaRoleOverridesEnabled())")) {
  failures.push("frontend/lib/request-identity.ts must confine client role overrides to explicit server-only beta override mode");
}
if (!requestIdentitySource.includes('overridePolicy !== "download-gate"') || !requestIdentitySource.includes("client-role-disabled")) {
  failures.push("frontend/lib/request-identity.ts must centralize download-gate client role override policy");
}
if (!requestIdentitySource.includes("trusted-sso-authoritative")) {
  failures.push("frontend/lib/request-identity.ts must ignore client role overrides when trusted SSO headers are enabled");
}
if (!requestIdentitySource.includes("cloudflareAccessHeadersPresent") || !requestIdentitySource.includes("cf-access-jwt-assertion")) {
  failures.push("frontend/lib/request-identity.ts must require Cloudflare Access assertion before trusting production SSO headers");
}
if (!requestIdentitySource.includes("return productionRuntime() ? null : headers.get(\"x-tjc-role\")")) {
  failures.push("frontend/lib/request-identity.ts must keep generic x-tjc-role trusted-header shim local-only");
}
if (!requestIdentitySource.includes("if (!trustedSsoHeadersTrusted(headers))")) {
  failures.push("frontend/lib/request-identity.ts must fail closed when configured SSO headers are not trusted for this request");
}
if (!requestIdentitySource.includes("BETA_SESSION_VERIFIED_HEADER") || !requestIdentitySource.includes("verifiedBetaSessionRole")) {
  failures.push("frontend/lib/request-identity.ts must require middleware-verified beta session headers before trusting beta roles");
}
if (/searchParams\.get\(["']role["']\)/.test(requestIdentitySource)) {
  failures.push("frontend/lib/request-identity.ts must not read role query params directly; routes pass explicit role strings into the identity seam");
}
if (!middlewareSource.includes("requestHeaders.delete(BETA_SESSION_ROLE_HEADER)") || !middlewareSource.includes("requestHeaders.delete(BETA_SESSION_VERIFIED_HEADER)")) {
  failures.push("frontend/middleware.ts must strip caller-supplied beta role headers before route identity helpers run");
}
if (!middlewareSource.includes("requestHeaders.set(BETA_SESSION_ROLE_HEADER, session.role)") || !middlewareSource.includes('requestHeaders.set(BETA_SESSION_VERIFIED_HEADER, "1")')) {
  failures.push("frontend/middleware.ts must inject beta role headers and verified marker only after verifying beta session cookies");
}
if (!middlewareSource.includes('pathname.startsWith("/api/beta-auth/")') || !middlewareSource.includes("NextResponse.next({ request: { headers: requestHeaders } })")) {
  failures.push("frontend/middleware.ts must pass sanitized headers through beta-auth routes");
}
if (/\/api\/beta-feedback[^"`']*\?role=DAM%20Admin/.test(enterpriseAdminSource)
  || /new URLSearchParams\(\{\s*role:\s*"DAM Admin"/s.test(enterpriseAdminSource)) {
  failures.push("frontend/components/dam/enterprise/AdminPage.tsx must not grant feedback inbox/export authority with DAM Admin query params");
}
if (/\/api\/saved-searches[^"`']*\?role=/.test(enterpriseLibrarySource)) {
  failures.push("frontend/components/dam/enterprise/LibraryPage.tsx must not grant saved-search write authority with role query params");
}
if (/\/api\/packages[^"`']*\?role=/.test(enterprisePackageSource)) {
  failures.push("frontend/components/dam/enterprise/PackageBuilderPage.tsx must not grant package draft write authority with role query params");
}
if (/\/api\/(admin\/readiness|review|brand-kits\/[^"`']+|assets\/[^"`']+)\?[^"`']*role=/.test(damApiClientSource)
  || /params\.set\(["']role["']/.test(damApiClientSource)) {
  failures.push("frontend/components/dam/useDamApi.ts must not send client role query params for privileged DAM API reads");
}
if (/\/api\/admin\/readiness\?[^"`']*role=/.test(legacyAdminSource)) {
  failures.push("frontend/components/AdminPage.tsx must not send client role query params for admin readiness");
}
if (/\/api\/review\?[^"`']*role=/.test(legacyReviewSource)) {
  failures.push("frontend/components/ReviewPage.tsx must not send client role query params for review queues");
}
if (/\/api\/assets\/[^"`']+\?[^"`']*role=/.test(legacyAssetDetailSource)) {
  failures.push("frontend/components/AssetDetailPage.tsx must not send client role query params for asset detail");
}
if (/params\.set\(["']role["']/.test(legacyLibrarySource) || /new URLSearchParams\(\{\s*role[,}:]/s.test(legacyLibrarySource)) {
  failures.push("frontend/components/LibraryPage.tsx must not send client role query params for asset search");
}
if (/\/api\/assets\/search\?[^"`']*role=/.test(legacyCollectionsSource)) {
  failures.push("frontend/components/CollectionsPage.tsx must not send client role query params for collection search");
}

if (failures.length) {
  console.error("API identity guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`API identity guard passed for ${routeFiles.length} routes.`);
