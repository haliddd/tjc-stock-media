#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const probePath = process.env.HOSTED_READONLY_PROBE_GUARD_SCRIPT || "scripts/portal-hosted-readonly-probe.mjs";
const summaryPath = process.env.HOSTED_READONLY_PROBE_GUARD_SUMMARY
  || "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json";
const source = fs.readFileSync(path.join(root, probePath), "utf8");
const failures = [];

const allowedMethods = new Set(["GET", "HEAD"]);
const methods = [...source.matchAll(/method:\s*"([A-Z]+)"/g)].map((match) => match[1]);
const requiredProbeIds = [
  "root-head",
  "session-get",
  "review-query-role",
  "admin-query-role",
  "asset-admin-query-role",
  "blocked-download-viewer"
];
const expectedHostedOutcomes = new Map([
  ["root-head", { finalUrlIncludes: "/beta-login" }],
  ["session-get", { statuses: [401, 403] }],
  ["review-query-role", { finalUrlIncludes: "/beta-login" }],
  ["admin-query-role", { finalUrlIncludes: "/beta-login" }],
  ["asset-admin-query-role", { finalUrlIncludes: "/beta-login" }],
  ["blocked-download-viewer", { finalUrlIncludes: "/beta-login" }]
]);
const forbiddenLeakTerms = [
  "sourcePath",
  "masterDrivePath",
  "sourceAlbumPath",
  "checksumSha256",
  "originalUrl",
  "signedUrl",
  "privateUrl",
  "BLOB_READ_WRITE_TOKEN",
  "KV_REST_API_TOKEN",
  "RESOURCESPACE_API_KEY",
  "RS_API_KEY",
  "AWS_SECRET",
  "BEGIN PRIVATE KEY"
];

if (!methods.length) failures.push(`${probePath} must declare explicit probe methods`);
for (const method of methods) {
  if (!allowedMethods.has(method)) failures.push(`${probePath} contains non-read-only probe method: ${method}`);
}
if (/\bmethod:\s*"(POST|PUT|PATCH|DELETE)"/.test(source)) {
  failures.push(`${probePath} must not include mutating hosted probe methods`);
}
if (/\bbody\s*:/.test(source) || /--data|--form|-F\s/.test(source)) {
  failures.push(`${probePath} must not send request bodies or form data`);
}
if (/response\.headers(?!\.get\("content-type"\))/.test(source) || /\brawHeaders\b|\bset-cookie\b/i.test(source)) {
  failures.push(`${probePath} must not store raw hosted response headers`);
}
if (/(^|\n)\s*body\s*:/.test(source) || /fs\.writeFileSync\([^)]*body/.test(source)) {
  failures.push(`${probePath} must not persist hosted response bodies`);
}
if (!source.includes('method === "HEAD" ? "" : await response.text()')) {
  failures.push(`${probePath} must skip response body reads for HEAD probes`);
}
if (!source.includes("No POST, no hosted writeback, no env mutation, no raw bodies or headers stored")) {
  failures.push(`${probePath} must document the read-only/no-raw-capture contract in the summary note`);
}
for (const id of requiredProbeIds) {
  if (!source.includes(`id: "${id}"`)) failures.push(`${probePath} missing required probe id: ${id}`);
}
for (const term of forbiddenLeakTerms) {
  if (!source.includes(term)) failures.push(`${probePath} forbidden-pattern scan must cover ${term}`);
}
if (!source.includes("forbiddenPatternFound") || !source.includes("adminShapeFound") || !source.includes("reviewShapeFound") || !source.includes("privilegedShapeFound")) {
  failures.push(`${probePath} must summarize leak/admin/review shape flags without raw payload capture`);
}
if (!source.includes("const failedProbe = results.find") || !source.includes("result.forbiddenPatternFound || result.privilegedShapeFound")) {
  failures.push(`${probePath} must fail closed when hosted read-only probes find forbidden or privileged response shapes`);
}
if (!source.includes("docs\", \"runs\", \"evidence\", \"2026-06-15\", \"hosted-readonly-probes\", \"summary.json")) {
  failures.push(`${probePath} must default output to the evidence hosted-readonly-probes summary path`);
}
if (!source.includes("scripts/safe-lane-headroom-guard.mjs")) {
  failures.push(`${probePath} must run safe-lane-headroom-guard before writing hosted read-only evidence`);
}
if (!source.includes('SAFE_LANE_HEADROOM_CONTEXT: process.env.SAFE_LANE_HEADROOM_CONTEXT || "portal-hosted-readonly-probe"')) {
  failures.push(`${probePath} must use portal-hosted-readonly-probe as the safe-lane headroom context`);
}

const summaryFullPath = path.join(root, summaryPath);
if (!fs.existsSync(summaryFullPath)) {
  failures.push(`${summaryPath} must exist as hosted read-only evidence`);
} else {
  try {
    const summary = JSON.parse(fs.readFileSync(summaryFullPath, "utf8"));
    if (!summary.checkedAt || typeof summary.checkedAt !== "string") failures.push(`${summaryPath} must include checkedAt`);
    if (!String(summary.note || "").includes("No POST, no hosted writeback, no env mutation, no raw bodies or headers stored")) {
      failures.push(`${summaryPath} must record the no-POST/no-raw-capture contract`);
    }
    if (!Array.isArray(summary.results) || summary.results.length < requiredProbeIds.length) {
      failures.push(`${summaryPath} must include all required hosted probe results`);
    }
    const resultsById = new Map((summary.results || []).map((result) => [result.id, result]));
    for (const id of requiredProbeIds) {
      if (!resultsById.has(id)) failures.push(`${summaryPath} missing required probe result: ${id}`);
    }
    for (const result of summary.results || []) {
      if (!allowedMethods.has(result.method)) failures.push(`${summaryPath} contains non-read-only method for ${result.id}: ${result.method}`);
      for (const rawKey of ["body", "rawBody", "headers", "rawHeaders", "setCookie", "cookies"]) {
        if (Object.prototype.hasOwnProperty.call(result, rawKey)) {
          failures.push(`${summaryPath} must not persist ${rawKey} for ${result.id}`);
        }
      }
      if (result.forbiddenPatternFound !== false) failures.push(`${summaryPath} forbiddenPatternFound must be false for ${result.id}`);
      if (result.privilegedShapeFound !== false) failures.push(`${summaryPath} privilegedShapeFound must be false for ${result.id}`);
      if (typeof result.bodyBytes !== "number") failures.push(`${summaryPath} bodyBytes must be bounded numeric summary for ${result.id}`);
      if (!Array.isArray(result.jsonKeys)) failures.push(`${summaryPath} jsonKeys must be bounded array summary for ${result.id}`);
      if ((result.jsonKeys || []).some((key) => forbiddenLeakTerms.includes(key))) {
        failures.push(`${summaryPath} jsonKeys must not expose forbidden/private key names for ${result.id}`);
      }
      const expectedOutcome = expectedHostedOutcomes.get(result.id);
      if (expectedOutcome?.finalUrlIncludes && !String(result.finalUrl || "").includes(expectedOutcome.finalUrlIncludes)) {
        failures.push(`${summaryPath} ${result.id} finalUrl must include ${expectedOutcome.finalUrlIncludes}`);
      }
      if (expectedOutcome?.statuses && !expectedOutcome.statuses.includes(result.status)) {
        failures.push(`${summaryPath} ${result.id} status must be one of ${expectedOutcome.statuses.join(", ")}`);
      }
    }
  } catch (error) {
    failures.push(`${summaryPath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("Hosted read-only probe guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted read-only probe guard passed.");
