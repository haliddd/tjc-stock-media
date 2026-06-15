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

const postIndex = source.search(/-X POST|\bPOST\b/);
const gateIndex = source.indexOf('if [ "$local_runtime_probe" != "1" ]; then');
if (postIndex === -1) failures.push(`${smokePath} must still declare hosted mutating POST checks honestly`);
if (gateIndex === -1 || (postIndex !== -1 && gateIndex > postIndex)) {
  failures.push(`${smokePath} must check hosted mutation approval before any POST path`);
}

const failClosedProbe = spawnSync("bash", [smokePath], {
  cwd: root,
  env: {
    ...process.env,
    BASE_URL: "https://example.invalid",
    PORTAL_HOSTED_SMOKE_ALLOW_MUTATION: "",
    PORTAL_HOSTED_SMOKE_APPROVED_BY: "",
    PORTAL_HOSTED_SMOKE_APPROVAL_REF: ""
  },
  encoding: "utf8"
});

const failClosedOutput = `${failClosedProbe.stdout || ""}\n${failClosedProbe.stderr || ""}`;
if (failClosedProbe.status !== 2) {
  failures.push(`${smokePath} must exit 2 before non-local mutation without approval; got ${failClosedProbe.status}`);
}
if (!failClosedOutput.includes("portal-hosted-smoke is mutating for non-local BASE_URL=https://example.invalid")) {
  failures.push(`${smokePath} fail-closed output must name non-local mutation risk`);
}
if (!failClosedOutput.includes("PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1") || !failClosedOutput.includes("PORTAL_HOSTED_SMOKE_APPROVED_BY")) {
  failures.push(`${smokePath} fail-closed output must name required approval env vars`);
}

if (failures.length) {
  console.error("Hosted smoke mutation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted smoke mutation guard passed.");
