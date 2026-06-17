#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = path.join(root, "scripts/portal-download-ticket-smoke.sh");
const source = fs.readFileSync(smokePath, "utf8");
const failures = [];

const requiredSnippets = [
  { label: "safe shell mode", text: "set -euo pipefail" },
  { label: "trusted identity helper", text: "portal-smoke-trusted-identity.sh" },
  { label: "trusted curl wrapper", text: "portal_smoke_http_code" },
  { label: "trusted Reviewer headers", text: "REVIEWER_HEADERS=(-H 'x-tjc-role: Reviewer'" },
  { label: "local runtime branch", text: 'if [ "$local_runtime_probe" = "1" ]; then' },
  { label: "search payload download field rejection", text: "search payload exposed imageUrls.download" },
  { label: "detail payload download field rejection", text: "approved-detail-hides-download-url" },
  { label: "viewer source redaction", text: "viewer-detail-redacts-source" },
  { label: "direct GET denied", text: "direct-approved-get-denied" },
  { label: "body role spoof denied locally", text: "body-role-spoof-denied-without-trusted-header" },
  { label: "terms false denied", text: "post-terms-false-denied" },
  { label: "ticket response private URL rejection", text: "ticket response leaked private delivery URL" },
  { label: "ticket reuse denied", text: "ticket-reuse-denied" },
  { label: "concurrent one-wins ticket proof", text: "ticket-concurrent-consume-one-wins" },
  { label: "thumbnail download variant blocked", text: "thumbnail-download-variant-blocked" },
  { label: "blocked asset POST denied", text: "blocked-asset-post-still-denied" },
  { label: "local audit persistence", text: "required download audit events persisted" },
  { label: "hosted admin readiness private URL rejection", text: "hosted-admin-readiness-audit-surface-safe" }
];

function checkSource(candidate) {
  const errors = [];
  for (const { label, text } of requiredSnippets) {
    if (!candidate.includes(text)) errors.push(`missing ${label}: ${text}`);
  }
  if (!/case "\$BASE_URL" in[\s\S]*http:\/\/localhost:\*\|http:\/\/127\.0\.0\.1:\*\)/.test(candidate)) {
    errors.push("missing localhost/127.0.0.1 local runtime probe restriction");
  }
  if (!/if \[ "\$local_runtime_probe" = "1" \]; then[\s\S]*body-role-spoof-denied-without-trusted-header[\s\S]*else[\s\S]*body-role-spoof-ignored-for-public-viewer/.test(candidate)) {
    errors.push("body-role spoof probe must keep local-deny and hosted-viewer branches explicit");
  }
  if (!/if \[ "\$local_runtime_probe" = "1" \]; then[\s\S]*required download audit events persisted[\s\S]*else[\s\S]*hosted-admin-readiness-audit-surface-safe/.test(candidate)) {
    errors.push("audit proof must keep local persistence and hosted safe-surface branches explicit");
  }
  if (!/signedUrl\|originalUrl\|s3:\\\/\\\//.test(candidate)) {
    errors.push("missing private delivery URL rejection patterns");
  }
  if (!/curl[\s\S]*"\$\{REVIEWER_HEADERS\[@\]\}"[\s\S]*"\$ABS_RACE_DOWNLOAD_URL"/.test(candidate)) {
    errors.push("concurrent consume race must use trusted Reviewer headers");
  }
  if (/DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1|PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1|NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1/.test(candidate)) {
    errors.push("download-ticket smoke must not enable demo/query/client role overrides");
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
expectFail("missing-trusted-reviewer-headers", source.replace("REVIEWER_HEADERS=(-H 'x-tjc-role: Reviewer'", "REVIEWER_HEADERS=(-H 'x-tjc-role: Viewer'"), "trusted Reviewer headers");
expectFail("missing-direct-get-denial", source.replace("direct-approved-get-denied", "direct-approved-get-allowed"), "direct GET denied");
expectFail("missing-body-role-spoof-denial", source.replace("body-role-spoof-denied-without-trusted-header", "body-role-spoof-minted-ticket"), "body role spoof denied locally");
expectFail("missing-private-url-rejection", source.replace(/signedUrl\|originalUrl\|s3:\\\/\\\//g, "publicUrl"), "private delivery URL rejection");
expectFail("missing-ticket-reuse-denial", source.replace("ticket-reuse-denied", "ticket-reuse-allowed"), "ticket reuse denied");
expectFail("missing-concurrent-consume-proof", source.replace("ticket-concurrent-consume-one-wins", "ticket-concurrent-consume-unchecked"), "concurrent one-wins ticket proof");
expectFail("missing-thumbnail-download-block", source.replace("thumbnail-download-variant-blocked", "thumbnail-download-variant-allowed"), "thumbnail download variant blocked");
expectFail("missing-blocked-asset-denial", source.replace("blocked-asset-post-still-denied", "blocked-asset-post-allowed"), "blocked asset POST denied");
expectFail("missing-local-audit-persistence", source.replace("required download audit events persisted", "download audit events unchecked"), "local audit persistence");
expectFail("accidental-role-override-env", `${source}\nPORTAL_ALLOW_BETA_ROLE_OVERRIDE=1\n`, "role overrides");

if (failures.length) {
  console.error("Portal download ticket smoke self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal download ticket smoke self-test passed.");
