#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = path.join(root, "scripts/portal-package-smoke.sh");
const source = fs.readFileSync(smokePath, "utf8");
const failures = [];

const requiredSnippets = [
  { label: "safe shell mode", text: "set -euo pipefail" },
  { label: "trusted identity helper", text: "portal-smoke-trusted-identity.sh" },
  { label: "trusted curl wrapper", text: "portal_smoke_http_code" },
  { label: "local runtime branch", text: 'if [ "$local_runtime_probe" = "1" ]; then' },
  { label: "viewer list denied", text: "package-viewer-list-denied" },
  { label: "viewer save denied", text: "package-viewer-save-denied" },
  { label: "contributor save sanitized", text: "package-contributor-save-sanitized" },
  { label: "reviewer list visible", text: "package-reviewer-list-visible" },
  { label: "storage readiness proof", text: "package-readiness-reports-storage" },
  { label: "local JSON cleanup", text: "package-drafts.json" },
  { label: "local JSON cap", text: "data.count > 200 || data.packages.length > 200" },
  { label: "unsafe persisted normalization", text: "persisted unsafe package was not normalized" },
  { label: "package readiness detail", text: "package draft readiness detail weak" },
  { label: "creator identity leak rejection", text: "package save response leaked creator identity" },
  { label: "refs sanitization", text: "package refs were not sanitized/deduped" },
  { label: "governance leak rejection", text: "package governance payload leaked private source metadata" }
];

const privateGovernanceFields = [
  "sourcePath",
  "masterDrivePath",
  "sourceAlbumPath",
  "originalFilename",
  "checksumSha256",
  "resourceSpaceId",
  "workflowState"
];

function checkSource(candidate) {
  const errors = [];
  for (const { label, text } of requiredSnippets) {
    if (!candidate.includes(text)) errors.push(`missing ${label}: ${text}`);
  }
  for (const text of privateGovernanceFields) {
    if (!candidate.includes(text)) errors.push(`missing private governance field check: ${text}`);
  }
  if (!/expect_json_status 403[\s\S]*package-viewer-list-denied/.test(candidate)) {
    errors.push("viewer package list must expect 403");
  }
  if (!/expect_json_status 403[\s\S]*package-viewer-save-denied/.test(candidate)) {
    errors.push("viewer package save must expect 403");
  }
  if (!/role=Viewer/.test(candidate) || !/role=Contributor/.test(candidate) || !/role=Reviewer/.test(candidate) || !/role=DAM%20Admin/.test(candidate)) {
    errors.push("missing Viewer, Contributor, Reviewer, and DAM Admin role probes");
  }
  if (!/existing\.unshift\(\{[\s\S]*\.\.\/private[\s\S]*not-a-date[\s\S]*role: "Viewer"/.test(candidate)) {
    errors.push("missing unsafe persisted local-json fixture");
  }
  if (!/Array\.from\(\{ length: 210 \}/.test(candidate)) {
    errors.push("missing oversized local-json cap fixture");
  }
  if (/DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1|PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1|NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1/.test(candidate)) {
    errors.push("package smoke must not enable demo/query/client role overrides");
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
expectFail("missing-viewer-list-denial", source.replace("package-viewer-list-denied", "package-viewer-list-allowed"), "viewer list denied");
expectFail("missing-viewer-save-denial", source.replace("package-viewer-save-denied", "package-viewer-save-allowed"), "viewer save denied");
expectFail("missing-contributor-save-sanitizer", source.replace("package-contributor-save-sanitized", "package-contributor-save-unsanitized"), "contributor save sanitized");
expectFail("missing-reviewer-list-proof", source.replace("package-reviewer-list-visible", "package-reviewer-list-unchecked"), "reviewer list visible");
expectFail("missing-storage-readiness", source.replace("package-readiness-reports-storage", "package-readiness-unchecked"), "storage readiness proof");
expectFail("missing-list-cap", source.replace("data.count > 200 || data.packages.length > 200", "false"), "local JSON cap");
expectFail("missing-unsafe-fixture", source.replace("not-a-date", "2026-01-01T00:00:00.000Z").replace("../private", "367"), "unsafe persisted local-json fixture");
expectFail("missing-private-governance-field", source.replaceAll("sourcePath", "publicPath"), "private governance field check");
expectFail("missing-governance-leak-rejection", source.replace("package governance payload leaked private source metadata", "package governance accepted"), "governance leak rejection");
expectFail("accidental-role-override-env", `${source}\nPORTAL_ALLOW_BETA_ROLE_OVERRIDE=1\n`, "role overrides");

if (failures.length) {
  console.error("Portal package smoke self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal package smoke self-test passed.");
