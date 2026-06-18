#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseUrl = new URL(process.env.BASE_URL || "http://localhost:4868");
const allowNonLocal = process.env.PORTAL_REDACTION_CRAWLER_ALLOW_NONLOCAL === "1";
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

if (!localHosts.has(baseUrl.hostname) && !allowNonLocal) {
  console.error("Normal-role redaction crawler is local-only by default. Set PORTAL_REDACTION_CRAWLER_ALLOW_NONLOCAL=1 only for approved read-only hosted checks.");
  process.exit(2);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function stringArrayConst(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
}

const sourceRedaction = read("frontend/lib/source-redaction.ts");
const forbiddenKeys = new Set([
  ...stringArrayConst(sourceRedaction, "sourceCustodyAssetKeys"),
  ...stringArrayConst(sourceRedaction, "publicHiddenAssetKeys"),
  "adminUrl",
  "checksum",
  "checksumMd5",
  "checksumSha256",
  "custodyPath",
  "md5",
  "masterPath",
  "masterUrl",
  "originalPath",
  "originalUrl",
  "privateUrl",
  "sha256",
  "signedUrl",
  "sourceUrl",
  "token",
  "secret"
].map((key) => key.toLowerCase()));

const forbiddenText = [
  { label: "file URI", pattern: /file:\/\//i },
  { label: "object-storage URI", pattern: /\b(?:s3|gs):\/\//i },
  { label: "local volume path", pattern: /\/Volumes\//i },
  { label: "shared drive path", pattern: /Shared Drives?\//i },
  { label: "private URL field", pattern: /\b(?:signedUrl|privateUrl|originalUrl|sourceUrl|masterUrl)\b/i },
  { label: "source custody field", pattern: /\b(?:source|original|master|custody)(?:Path|_path)\b/i },
  { label: "checksum/hash field", pattern: /\b(?:checksum|sha256|md5)\b/i },
  { label: "fixture source", pattern: /\b(?:demo-fallback|fixture fallback|hosted pagination fixture|qa\.fixture@)\b/i },
  { label: "secret/token field", pattern: /\b(?:BETA_SESSION_SECRET|KV_REST_API_TOKEN|BLOB_READ_WRITE_TOKEN|RESOURCESPACE_API_KEY|token|secret)\b/i },
  { label: "ResourceSpace admin URL", pattern: /https?:\/\/[^"'\s]*resourcespace[^"'\s]*(?:admin|api|login|user)/i }
];

const staticPaths = [
  "/",
  "/collections?role=Viewer",
  "/upload?role=Viewer",
  "/review?role=Viewer",
  "/admin?role=Viewer",
  "/guide?role=Viewer",
  "/api/assets/search?role=Viewer&limit=8",
  "/api/assets/search?role=Contributor&limit=8",
  "/api/review?role=Viewer",
  "/api/admin/readiness?role=Viewer",
  "/api/packages?role=Viewer",
  "/api/saved-searches?role=Viewer",
  "/api/beta-feedback?role=Viewer",
  "/api/beta-feedback/export?role=Viewer",
  "/api/brand-kits/mvp-2024?role=Viewer"
];

const findings = [];
const checked = [];

function routeUrl(route) {
  return new URL(route, baseUrl).toString();
}

function recordFinding(route, message) {
  findings.push(`${route}: ${message}`);
}

function scanText(route, text) {
  for (const { label, pattern } of forbiddenText) {
    if (pattern.test(text)) {
      recordFinding(route, `body leaked ${label}`);
    }
  }
}

function scanHeaders(route, headers) {
  for (const name of ["location", "content-location", "x-vercel-blob-url", "x-source-url", "x-original-url"]) {
    const value = headers.get(name);
    if (!value) continue;
    scanText(`${route} header ${name}`, value);
  }
}

function scanJson(route, value, pathLabel = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanJson(route, item, `${pathLabel}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = `${pathLabel}.${key}`;
      if (forbiddenKeys.has(key.toLowerCase())) {
        recordFinding(route, `JSON key leak ${nextPath}`);
      }
      scanJson(route, nested, nextPath);
    }
    return;
  }
  if (typeof value === "string") {
    scanText(`${route} ${pathLabel}`, value);
  }
}

async function fetchAndScan(route) {
  const response = await fetch(routeUrl(route), {
    headers: {
      "x-tjc-role": route.includes("role=Contributor") ? "Contributor" : "Viewer",
      "x-auth-request-email": route.includes("role=Contributor") ? "contributor-redaction@example.test" : "viewer-redaction@example.test"
    },
    redirect: "manual"
  });
  const contentType = response.headers.get("content-type") || "";
  checked.push(`${route} (${response.status})`);
  scanHeaders(route, response.headers);
  if (response.status >= 500) {
    recordFinding(route, `unexpected server error ${response.status}`);
    return null;
  }
  if (!/json|text|html/i.test(contentType)) return null;
  const text = await response.text();
  if (/json/i.test(contentType)) {
    try {
      const data = JSON.parse(text);
      scanJson(route, data);
      return data;
    } catch {
      recordFinding(route, "JSON response could not parse");
      return null;
    }
  }
  scanText(route, text);
  return null;
}

function assetIdsFromSearch(data) {
  return (Array.isArray(data?.assets) ? data.assets : [])
    .map((asset) => asset?.id)
    .filter((id) => typeof id === "string" && id)
    .slice(0, 3);
}

const dynamicPaths = [];
for (const route of staticPaths) {
  const data = await fetchAndScan(route);
  if (route.startsWith("/api/assets/search")) {
    const role = route.includes("role=Contributor") ? "Contributor" : "Viewer";
    for (const id of assetIdsFromSearch(data)) {
      dynamicPaths.push(`/api/assets/${encodeURIComponent(id)}?role=${role}`);
      dynamicPaths.push(`/api/download/${encodeURIComponent(id)}?role=${role}`);
    }
  }
}

for (const route of [...new Set(dynamicPaths)]) {
  await fetchAndScan(route);
}

if (findings.length) {
  console.error("Normal-role redaction crawler failed:");
  for (const finding of findings.slice(0, 60)) console.error(`- ${finding}`);
  if (findings.length > 60) console.error(`- ... ${findings.length - 60} more findings`);
  process.exit(1);
}

console.log(`Normal-role redaction crawler passed for ${checked.length} routes.`);
