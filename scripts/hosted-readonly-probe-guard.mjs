#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const probePath = process.env.HOSTED_READONLY_PROBE_GUARD_SCRIPT || "scripts/portal-hosted-readonly-probe.mjs";
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

if (failures.length) {
  console.error("Hosted read-only probe guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted read-only probe guard passed.");
