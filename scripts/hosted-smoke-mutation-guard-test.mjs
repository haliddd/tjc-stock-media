#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/hosted-smoke-mutation-guard.mjs");
const smokeRelativePath = "scripts/portal-hosted-smoke.sh";
const sourceSmokePath = path.join(root, smokeRelativePath);
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-hosted-smoke-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function write(filePath, source) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source);
}

function fixturePath(label) {
  const fixtureRoot = path.join(tempRoot, label);
  const target = path.join(fixtureRoot, smokeRelativePath);
  write(target, fs.readFileSync(sourceSmokePath, "utf8"));
  fs.chmodSync(target, 0o755);
  return fixtureRoot;
}

function readFixture(fixtureRoot) {
  return fs.readFileSync(path.join(fixtureRoot, smokeRelativePath), "utf8");
}

function writeFixture(fixtureRoot, source) {
  const target = path.join(fixtureRoot, smokeRelativePath);
  write(target, source);
  fs.chmodSync(target, 0o755);
}

function runGuard(cwd, env = {}) {
  return spawnSync(process.execPath, [guardPath], {
    cwd,
    env: {
      ...process.env,
      HOSTED_SMOKE_MUTATION_GUARD_SCRIPT: smokeRelativePath,
      ...env
    },
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
    return;
  }
  const fixtureRoot = fixturePath(label);
  if (mutate) mutate(fixtureRoot);
  const result = runGuard(fixtureRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const fixtureRoot = fixturePath(label);
  mutate(fixtureRoot);
  const result = runGuard(fixtureRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("missing-approval-flag", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace(/PORTAL_HOSTED_SMOKE_ALLOW_MUTATION/g, "PORTAL_HOSTED_SMOKE_MUTATION"));
});

expectFail("no-hard-stop-exit-2", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("    exit 2", "    exit 0"));
});

expectFail("missing-readonly-fallback-copy", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("Use portal-hosted-readonly-probe for unauthenticated hosted read-only proof.", "Run hosted smoke after approval."));
});

expectFail("local-bypass-too-broad", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("http://localhost:*|http://127.0.0.1:*|http://[::1]:*) local_runtime_probe=1", "http://*) local_runtime_probe=1"));
});

if (failures.length) {
  console.error("Hosted smoke mutation guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted smoke mutation guard self-test passed.");
