#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = path.join(root, "scripts/portal-delivery-smoke.sh");
const source = fs.readFileSync(smokePath, "utf8");
const failures = [];

const requiredSnippets = [
  { label: "safe shell mode", text: "set -euo pipefail" },
  { label: "trusted identity helper", text: "portal-smoke-trusted-identity.sh" },
  { label: "trusted curl wrapper", text: "portal_smoke_http_code" },
  { label: "Viewer search proof", text: "viewer-search-delivery-safe" },
  { label: "Contributor search proof", text: "contributor-search-delivery-safe" },
  { label: "Viewer detail proof", text: "viewer-asset-delivery-safe" },
  { label: "Contributor detail proof", text: "contributor-asset-delivery-safe" },
  { label: "Viewer download block", text: "viewer-download-gate-no-private-url" },
  { label: "Reviewer blocked POST proof", text: "reviewer-download-post-no-private-url" },
  { label: "admin S3 readiness honesty", text: "admin-s3-readiness-honest" },
  { label: "source redaction check", text: 'data.source.label !== "Media library"' },
  { label: "private URL block", text: "data.downloadUrl || data.url || data.signedUrl || data.originalUrl" },
  { label: "S3 overclaim rejection", text: "S3 readiness overclaimed production delivery" },
  { label: "signed delivery proof gap", text: "S3 readiness does not name signed delivery proof gap" }
];

const forbiddenKeySnippets = [
  "checksumSha256",
  "masterDrivePath",
  "originalFilename",
  "resourceSpaceUrl",
  "sourceAlbumPath",
  "sourcePath",
  "workflowState"
];

const forbiddenTextSnippets = [
  "s3:\\/\\/",
  "amazonaws\\.com",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "private[- ]s3",
  "master drive",
  "checksum"
];

function checkSource(candidate) {
  const errors = [];
  for (const { label, text } of requiredSnippets) {
    if (!candidate.includes(text)) errors.push(`missing ${label}: ${text}`);
  }
  for (const text of forbiddenKeySnippets) {
    if (!candidate.includes(text)) errors.push(`missing forbidden key check: ${text}`);
  }
  for (const text of forbiddenTextSnippets) {
    if (!candidate.includes(text)) errors.push(`missing forbidden text check: ${text}`);
  }
  if (!/expect_json_status 403[\s\S]*viewer-download-gate-no-private-url/.test(candidate)) {
    errors.push("viewer download gate must expect 403");
  }
  if (!/expect_json_any_status "403 404"[\s\S]*reviewer-download-post-no-private-url/.test(candidate)) {
    errors.push("reviewer blocked download POST must expect 403 or 404");
  }
  if (!/role=Viewer/.test(candidate) || !/role=Contributor/.test(candidate) || !/role=DAM%20Admin/.test(candidate)) {
    errors.push("missing Viewer, Contributor, and DAM Admin role probes");
  }
  if (/DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1|PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1|NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1/.test(candidate)) {
    errors.push("delivery smoke must not enable demo/query/client role overrides");
  }
  return errors;
}

function expectPass(label, candidate) {
  const errors = checkSource(candidate);
  if (errors.length) failures.push(`${label} should pass:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

function expectFail(label, candidate, expectedText) {
  const errors = checkSource(candidate);
  if (!errors.length) {
    failures.push(`${label} should fail but passed`);
    return;
  }
  if (expectedText && !errors.some((error) => error.includes(expectedText))) {
    failures.push(`${label} failure should mention ${expectedText}:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

expectPass("current-real-smoke", source);

expectFail(
  "missing-trusted-helper",
  source.replace('source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"', "# helper removed"),
  "trusted identity helper"
);
expectFail("missing-viewer-detail-proof", source.replace("viewer-asset-delivery-safe", "viewer-asset-delivery-unchecked"), "Viewer detail proof");
expectFail("missing-contributor-detail-proof", source.replace("contributor-asset-delivery-safe", "contributor-asset-delivery-unchecked"), "Contributor detail proof");
expectFail("missing-viewer-download-block", source.replace("viewer-download-gate-no-private-url", "viewer-download-gate-url-allowed"), "Viewer download block");
expectFail("missing-reviewer-blocked-post", source.replace("reviewer-download-post-no-private-url", "reviewer-download-post-url-allowed"), "Reviewer blocked POST proof");
expectFail("missing-private-url-block", source.replace("data.downloadUrl || data.url || data.signedUrl || data.originalUrl", "false"), "private URL block");
expectFail("missing-s3-pattern", source.replace("amazonaws\\.com", "public-cdn"), "forbidden text check");
expectFail("missing-source-path-key", source.replace('"sourcePath",', ""), "forbidden key check");
expectFail("s3-readiness-overclaim-not-checked", source.replace("S3 readiness overclaimed production delivery", "S3 readiness accepted"), "S3 overclaim rejection");
expectFail("blocked-post-status-weakened", source.replace('expect_json_any_status "403 404"', 'expect_json_any_status "200 403 404"'), "reviewer blocked download POST");
expectFail("accidental-role-override-env", `${source}\nPORTAL_ALLOW_BETA_ROLE_OVERRIDE=1\n`, "role overrides");

if (failures.length) {
  console.error("Portal delivery smoke self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal delivery smoke self-test passed.");
