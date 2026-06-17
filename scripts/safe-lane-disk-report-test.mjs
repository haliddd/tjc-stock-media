#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "scripts/safe-lane-disk-report.mjs");
const failures = [];
const tempPaths = [];

function makeTempDir(prefix) {
  const tempPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempPaths.push(tempPath);
  return tempPath;
}

process.on("exit", () => {
  for (const tempPath of tempPaths) fs.rmSync(tempPath, { recursive: true, force: true });
});

function runDiskReport(options = {}) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8"
  });
}

function expectPass(label, result) {
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, result, expectedText) {
  if (result.status === 0) {
    failures.push(`${label} should fail but passed:\n${result.stdout}`);
    return;
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes(expectedText)) failures.push(`${label} missing expected failure text: ${expectedText}`);
}

const source = fs.readFileSync(scriptPath, "utf8");
for (const forbidden of ["fs.rm", "fs.rmSync", "fs.unlink", "fs.unlinkSync", "fs.rmdir", "fs.rmdirSync", "rm -rf"]) {
  if (source.includes(forbidden)) failures.push(`disk report must remain report-only; found ${forbidden}`);
}
for (const requiredText of [
  "This script deletes nothing",
  "Do not delete from this report",
  "Default heavy-run minimum",
  "Heavy local reruns",
  "SAFE_LANE_HEADROOM_OVERRIDE_REASON",
  "shared checkout",
  "source media",
  "evidence docs and screenshots"
]) {
  if (!source.includes(requiredText)) failures.push(`disk report missing output boundary: ${requiredText}`);
}

const current = runDiskReport();
expectPass("current-safe-lane-report", current);
if (current.status === 0) {
  for (const expectedText of [
    "Report-only candidates",
    "This script deletes nothing",
    "Default heavy-run minimum: 10 GiB",
    "Heavy local reruns:",
    "shared checkout: /Users/halim4pro/Desktop/MVP/tjc-stock-media"
  ]) {
    if (!current.stdout.includes(expectedText)) failures.push(`current report missing ${expectedText}`);
  }
  if (current.stdout.includes("Heavy local reruns: BLOCKED")) {
    for (const expectedText of [
      "Blocked scope: dev/build/start/browser/smoke/bootstrap/docker/import/media/backup.",
      "Focused threshold override requires SAFE_LANE_HEADROOM_OVERRIDE_REASON."
    ]) {
      if (!current.stdout.includes(expectedText)) failures.push(`current blocked report missing ${expectedText}`);
    }
  } else if (!current.stdout.includes("Heavy local reruns: PASS default 10 GiB headroom.")) {
    failures.push("current report missing high-headroom PASS copy");
  }
}

const tempRepo = makeTempDir("tjc-safe-disk-report-");
spawnSync("git", ["init"], { cwd: tempRepo, encoding: "utf8" });
const sharedCheckoutResult = runDiskReport({
  cwd: tempRepo,
  env: {
    SAFE_LANE_EXPECTED_WORKTREE: tempRepo,
    SAFE_LANE_EXPECTED_SOURCE_CHECKOUT: tempRepo
  }
});
expectFail("shared-checkout-refusal", sharedCheckoutResult, "safe disk report refused to run in shared checkout");

const wrongWorktreeResult = runDiskReport({
  env: {
    SAFE_LANE_EXPECTED_WORKTREE: tempRepo
  }
});
expectFail("wrong-worktree-refusal", wrongWorktreeResult, "safe disk report must run inside isolated worktree");

if (failures.length) {
  console.error("Safe lane disk report self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Safe lane disk report self-test passed.");
