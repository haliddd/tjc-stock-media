#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = process.env.HOSTED_SMOKE_MUTATION_GUARD_SCRIPT || "scripts/portal-hosted-smoke.sh";
const source = fs.readFileSync(path.join(root, smokePath), "utf8");
const failures = [];

function requireText(text, label = text) {
  if (!source.includes(text)) failures.push(`${smokePath} missing ${label}`);
}

requireText("PORTAL_HOSTED_SMOKE_ALLOW_MUTATION", "explicit hosted mutation approval flag");
requireText("PORTAL_HOSTED_SMOKE_APPROVED_BY", "explicit hosted mutation approver");
requireText("portal-hosted-smoke is mutating for non-local BASE_URL", "non-local mutation warning");
requireText("Use portal-hosted-readonly-probe", "read-only hosted proof fallback");
requireText('exit 2', "hard stop before hosted mutation");
requireText('http://localhost:*|http://127.0.0.1:*|http://[::1]:*) local_runtime_probe=1', "local-only bypass");
requireText('if [ "$local_runtime_probe" != "1" ]; then', "non-local gate branch");
requireText('if [ "${PORTAL_HOSTED_SMOKE_ALLOW_MUTATION:-}" != "1" ] || [ -z "${PORTAL_HOSTED_SMOKE_APPROVED_BY:-}" ]; then', "approval condition");
requireText("scripts/safe-lane-headroom-guard.mjs", "safe-lane headroom guard before hosted smoke work");
requireText('SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-hosted-smoke}"', "hosted smoke headroom context");

const postIndex = source.search(/-X POST/);
const gateIndex = source.indexOf('if [ "$local_runtime_probe" != "1" ]; then');
const headroomIndex = source.indexOf("scripts/safe-lane-headroom-guard.mjs");
if (postIndex === -1) failures.push(`${smokePath} must still declare hosted mutating POST checks honestly`);
if (gateIndex === -1 || (postIndex !== -1 && gateIndex > postIndex)) {
  failures.push(`${smokePath} must check hosted mutation approval before any POST path`);
}
if (headroomIndex === -1 || (postIndex !== -1 && headroomIndex > postIndex)) {
  failures.push(`${smokePath} must run safe-lane headroom guard before any hosted POST path`);
}

function expectFailClosed(label, env) {
  const probe = spawnSync("bash", [smokePath], {
    cwd: root,
    env: {
      ...process.env,
      BASE_URL: "https://example.invalid",
      PORTAL_HOSTED_SMOKE_ALLOW_MUTATION: "",
      PORTAL_HOSTED_SMOKE_APPROVED_BY: "",
      PORTAL_HOSTED_SMOKE_APPROVAL_REF: "",
      ...env
    },
    encoding: "utf8"
  });
  const output = `${probe.stdout || ""}\n${probe.stderr || ""}`;
  if (probe.status !== 2) {
    failures.push(`${smokePath} must exit 2 before non-local mutation for ${label}; got ${probe.status}`);
  }
  if (!output.includes("portal-hosted-smoke is mutating for non-local BASE_URL=https://example.invalid")) {
    failures.push(`${smokePath} fail-closed output must name non-local mutation risk for ${label}`);
  }
  if (!output.includes("PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1") || !output.includes("PORTAL_HOSTED_SMOKE_APPROVED_BY")) {
    failures.push(`${smokePath} fail-closed output must name required approval env vars for ${label}`);
  }
}

expectFailClosed("no approval env", {});
expectFailClosed("allow flag without approver", {
  PORTAL_HOSTED_SMOKE_ALLOW_MUTATION: "1"
});
expectFailClosed("approver without allow flag", {
  PORTAL_HOSTED_SMOKE_APPROVED_BY: "Hali"
});

if (fs.existsSync(path.join(root, "scripts/safe-lane-headroom-guard.mjs"))) {
  const approvedProbe = spawnSync("bash", [smokePath], {
    cwd: root,
    env: {
      ...process.env,
      BASE_URL: "https://example.invalid",
      PORTAL_HOSTED_SMOKE_ALLOW_MUTATION: "1",
      PORTAL_HOSTED_SMOKE_APPROVED_BY: "Hali",
      SAFE_LANE_MIN_FREE_GIB: "999999"
    },
    encoding: "utf8"
  });
  const approvedOutput = `${approvedProbe.stdout || ""}\n${approvedProbe.stderr || ""}`;
  if (approvedProbe.status === 0) {
    failures.push(`${smokePath} approved hosted fixture should fail under impossible headroom before mutation`);
  } else {
    if (!approvedOutput.includes("hosted mutation smoke approved by Hali")) {
      failures.push(`${smokePath} approved hosted fixture should report approver before headroom check`);
    }
    if (!approvedOutput.includes("Safe lane headroom guard failed")) {
      failures.push(`${smokePath} approved hosted fixture should fail through safe-lane headroom guard`);
    }
    if (!approvedOutput.includes("portal-hosted-smoke")) {
      failures.push(`${smokePath} approved hosted fixture should preserve portal-hosted-smoke context`);
    }
    if (/hosted-root|hosted-feedback-post|beta-login-/.test(approvedOutput)) {
      failures.push(`${smokePath} approved hosted fixture must fail before hosted smoke curl actions`);
    }
  }
}

if (failures.length) {
  console.error("Hosted smoke mutation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted smoke mutation guard passed.");
