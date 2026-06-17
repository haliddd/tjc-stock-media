#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const guardPath = path.join(root, "scripts/small-team-beta-readiness-guard.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-small-team-beta-readiness-"));
const failures = [];

const fixtureFiles = [
  "docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md",
  "docs/runs/evidence/2026-06-17/open-blockers.json",
  "docs/runs/evidence/2026-06-17/hosted-readonly-probes/summary.json",
  "docs/screenshots/qa/browser-qa-report.json",
  "docs/small-team-beta-operations-runbook.md",
  "docs/joanna-mini-beta-runbook.md",
  "docs/joanna-mini-beta-readiness-report.md",
  "docs/team-beta-internal-test-packet.md",
  "docs/team-beta-go-no-go-packet.md"
];

process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyFixture(label) {
  const targetRoot = path.join(tempRoot, label);
  for (const file of fixtureFiles) {
    const source = path.join(root, file);
    const target = path.join(targetRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  fs.writeFileSync(path.join(targetRoot, relativePath), source);
}

function runGuard(targetRoot = root) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      SMALL_TEAM_BETA_READINESS_GUARD_ROOT: targetRoot
    },
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  const targetRoot = label === "current-real-lane" ? root : copyFixture(label);
  if (mutate) mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const targetRoot = copyFixture(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("browser-qa-failures-overclaimed", (targetRoot) => {
  const file = "docs/screenshots/qa/browser-qa-report.json";
  const payload = JSON.parse(read(targetRoot, file));
  payload.failures = ["mobile overflow"];
  write(targetRoot, file, `${JSON.stringify(payload, null, 2)}\n`);
});

expectFail("hosted-url-overclaimed", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md";
  write(targetRoot, file, read(targetRoot, file).replace("Hosted/current deployment was not proven.", "Hosted/current deployment was proven."));
});

expectFail("team-packet-go-overclaim", (targetRoot) => {
  const file = "docs/team-beta-internal-test-packet.md";
  write(targetRoot, file, read(targetRoot, file).replace("small-team beta not ready, NO-GO for sending teammate invites", "Small-team beta ready"));
});

expectFail("real-content-count-overclaimed", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md";
  write(targetRoot, file, read(targetRoot, file).replace("The real hosted/current content target of 181 approved photos plus remaining pending/unapproved photos was not proven.", "The real hosted/current content target of 181 approved photos plus remaining pending/unapproved photos was proven."));
});

expectFail("raw-invite-code-example", (targetRoot) => {
  const file = "docs/joanna-mini-beta-runbook.md";
  write(targetRoot, file, read(targetRoot, file).replace("<QUEENS_INVITE_CODE>", "private-code"));
});

expectFail("blocker-overclaimed-pass", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/open-blockers.json";
  const payload = JSON.parse(read(targetRoot, file));
  payload.blockers = payload.blockers.map((blocker) => blocker.id === "real-content-counts"
    ? { ...blocker, status: "pass" }
    : blocker);
  write(targetRoot, file, `${JSON.stringify(payload, null, 2)}\n`);
});

expectFail("hosted-invite-overclaimed-go", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/open-blockers.json";
  const payload = JSON.parse(read(targetRoot, file));
  payload.hostedTeammateInviteDecision = "GO";
  write(targetRoot, file, `${JSON.stringify(payload, null, 2)}\n`);
});

expectFail("hosted-readonly-privileged-shape", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/hosted-readonly-probes/summary.json";
  const payload = JSON.parse(read(targetRoot, file));
  payload.results = payload.results.map((result) => result.id === "admin-query-role"
    ? { ...result, privilegedShapeFound: true }
    : result);
  write(targetRoot, file, `${JSON.stringify(payload, null, 2)}\n`);
});

expectFail("hosted-build-contract-invalid", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-17/open-blockers.json";
  const payload = JSON.parse(read(targetRoot, file));
  payload.localProofSummary.buildCurrentness.hostedSessionBuildContract = "unexpected-contract";
  write(targetRoot, file, `${JSON.stringify(payload, null, 2)}\n`);
});

if (failures.length) {
  console.error("Small-team beta readiness guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Small-team beta readiness guard self-test passed.");
