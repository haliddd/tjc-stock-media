#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/safe-lane-headroom-guard.mjs");
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

function runGuard(options = {}) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: options.cwd || root,
    env: {
      ...process.env,
      SAFE_LANE_HEADROOM_CONTEXT: "self-test",
      ...(options.env || {})
    },
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
  if (!output.includes(expectedText)) failures.push(`${label} missing expected text: ${expectedText}`);
}

const missingReasonResult = runGuard({ env: { SAFE_LANE_MIN_FREE_GIB: "0" } });
expectFail("lower-threshold-requires-reason", missingReasonResult, "SAFE_LANE_HEADROOM_OVERRIDE_REASON");

const invalidMinimumResult = runGuard({ env: { SAFE_LANE_MIN_FREE_GIB: "not-a-number" } });
expectFail("invalid-minimum-hard-stop", invalidMinimumResult, "SAFE_LANE_MIN_FREE_GIB must be a non-negative integer");

const passResult = runGuard({
  env: {
    SAFE_LANE_MIN_FREE_GIB: "0",
    SAFE_LANE_HEADROOM_OVERRIDE_REASON: "self-test non-heavy fixture"
  }
});
expectPass("zero-minimum-current-worktree-with-reason", passResult);

const lowDiskResult = runGuard({ env: { SAFE_LANE_MIN_FREE_GIB: "99999" } });
expectFail("low-disk-hard-stop", lowDiskResult, "free disk");
expectFail("low-disk-remediation-copy", lowDiskResult, "make safe-lane-disk-report");

const wrongWorktreeResult = runGuard({
  env: { SAFE_LANE_EXPECTED_WORKTREE: makeTempDir("tjc-headroom-wrong-") }
});
expectFail("wrong-worktree-hard-stop", wrongWorktreeResult, "only inside isolated worktree");

const tempRepo = makeTempDir("tjc-headroom-shared-");
spawnSync("git", ["init"], { cwd: tempRepo, encoding: "utf8" });
const sharedCheckoutResult = runGuard({
  cwd: tempRepo,
  env: {
    SAFE_LANE_EXPECTED_WORKTREE: tempRepo,
    SAFE_LANE_EXPECTED_SOURCE_CHECKOUT: tempRepo,
    SAFE_LANE_MIN_FREE_GIB: "0",
    SAFE_LANE_HEADROOM_OVERRIDE_REASON: "self-test shared checkout fixture"
  }
});
expectFail("shared-checkout-hard-stop", sharedCheckoutResult, "refusing self-test in shared checkout");

if (failures.length) {
  console.error("Safe lane headroom guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Safe lane headroom guard self-test passed.");
