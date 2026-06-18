#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = path.join(root, "scripts/portal-sso-smoke.sh");
const source = fs.readFileSync(smokePath, "utf8");
const failures = [];

const requiredSnippets = [
  { label: "safe shell mode", text: "set -euo pipefail" },
  { label: "direct safe-lane headroom guard", text: 'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-sso-smoke}"' },
  { label: "Reviewer trusted header", text: '-H "x-tjc-role: Reviewer"' },
  { label: "DAM Admin trusted header", text: '-H "x-tjc-role: DAM Admin"' },
  { label: "Contributor trusted header", text: '-H "x-tjc-role: Contributor"' },
  { label: "trusted SSO email header", text: "cf-access-authenticated-user-email" },
  { label: "malformed admin denial", text: "malformed-admin-header-does-not-escalate" },
  { label: "negative admin phrase denial", text: "negative-admin-phrase-does-not-escalate" },
  { label: "query admin denial without trusted role", text: "missing-trusted-role-does-not-use-query-admin" },
  { label: "group admin beats viewer header", text: "group-admin-claim-beats-viewer-header" },
  { label: "admin opens readiness", text: "admin-header-overrides-viewer" },
  { label: "reviewer opens review queue", text: "reviewer-header-opens-review-queue" },
  { label: "reviewer lists packages", text: "reviewer-header-lists-packages" },
  { label: "reviewer previews batch", text: "reviewer-header-previews-batch" },
  { label: "contributor previews collection", text: "contributor-header-previews-collection" },
  { label: "contributor validates upload", text: "contributor-header-validates-upload" },
  { label: "admin opens feedback inbox", text: "admin-header-opens-feedback-inbox" },
  { label: "unsafe download remains blocked", text: "reviewer-header-keeps-unsafe-download-blocked" }
];

function checkSource(candidate) {
  const errors = [];
  for (const { label, text } of requiredSnippets) {
    if (!candidate.includes(text)) errors.push(`missing ${label}: ${text}`);
  }
  if (!/x-tjc-groups: ministry members, DAM Admin/.test(candidate)) {
    errors.push("missing trusted group admin claim fixture");
  }
  if (!/role=Viewer/.test(candidate) || !/"role":"Viewer"/.test(candidate)) {
    errors.push("missing client Viewer downgrade/spoof fixtures");
  }
  if (!/expect_json_status 403[\s\S]*malformed-admin-header-does-not-escalate/.test(candidate)) {
    errors.push("malformed admin probe must expect 403");
  }
  if (!/expect_json_status 403[\s\S]*missing-trusted-role-does-not-use-query-admin/.test(candidate)) {
    errors.push("query admin without trusted role must expect 403");
  }
  if (!/expect_json_any_status "403 503"[\s\S]*reviewer-header-keeps-unsafe-download-blocked/.test(candidate)) {
    errors.push("unsafe download probe must expect 403 or 503 and blocked payload");
  }
  if (/DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1|PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1|NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1/.test(candidate)) {
    errors.push("SSO smoke must not enable demo/query/client role overrides");
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
  "missing-headroom-guard",
  source.replace('SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-sso-smoke}"', "SAFE_LANE_HEADROOM_CONTEXT=disabled"),
  "direct safe-lane headroom guard"
);
expectFail("missing-reviewer-header", source.replace('-H "x-tjc-role: Reviewer"', '-H "x-tjc-role: Viewer"'), "Reviewer trusted header");
expectFail("missing-admin-header", source.replace('-H "x-tjc-role: DAM Admin"', '-H "x-tjc-role: Viewer"'), "DAM Admin trusted header");
expectFail("missing-contributor-header", source.replace('-H "x-tjc-role: Contributor"', '-H "x-tjc-role: Viewer"'), "Contributor trusted header");
expectFail("missing-malformed-admin-denial", source.replace("malformed-admin-header-does-not-escalate", "malformed-admin-header-allowed"), "malformed admin denial");
expectFail("missing-query-admin-denial", source.replace("missing-trusted-role-does-not-use-query-admin", "query-admin-used-without-trusted-role"), "query admin denial without trusted role");
expectFail("missing-group-admin-fixture", source.replace("x-tjc-groups: ministry members, DAM Admin", "x-tjc-groups: ministry members"), "trusted group admin claim fixture");
expectFail("missing-unsafe-download-block", source.replace("reviewer-header-keeps-unsafe-download-blocked", "reviewer-header-allows-unsafe-download"), "unsafe download remains blocked");
expectFail("unsafe-download-status-weakened", source.replace('expect_json_any_status "403 503"', 'expect_json_any_status "200 403 503"'), "unsafe download probe");
expectFail("accidental-role-override-env", `${source}\nDOWNLOAD_GATE_ALLOW_DEMO_ROLES=1\n`, "role overrides");

if (failures.length) {
  console.error("Portal SSO smoke self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal SSO smoke self-test passed.");
