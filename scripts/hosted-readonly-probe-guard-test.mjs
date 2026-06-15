#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/hosted-readonly-probe-guard.mjs");
const probeRelativePath = "scripts/portal-hosted-readonly-probe.mjs";
const sourceProbePath = path.join(root, probeRelativePath);
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-hosted-readonly-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function write(filePath, source) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source);
}

function fixturePath(label) {
  const fixtureRoot = path.join(tempRoot, label);
  write(path.join(fixtureRoot, probeRelativePath), fs.readFileSync(sourceProbePath, "utf8"));
  return fixtureRoot;
}

function readFixture(fixtureRoot) {
  return fs.readFileSync(path.join(fixtureRoot, probeRelativePath), "utf8");
}

function writeFixture(fixtureRoot, source) {
  write(path.join(fixtureRoot, probeRelativePath), source);
}

function runGuard(cwd, env = {}) {
  return spawnSync(process.execPath, [guardPath], {
    cwd,
    env: {
      ...process.env,
      HOSTED_READONLY_PROBE_GUARD_SCRIPT: probeRelativePath,
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

expectFail("post-method-regression", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace('method: "GET", path: "/api/review', 'method: "POST", path: "/api/review'));
});

expectFail("request-body-regression", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("method,\n      redirect:", "method,\n      body: JSON.stringify({ probe: true }),\n      redirect:"));
});

expectFail("head-body-read-regression", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace('method === "HEAD" ? "" : await response.text()', "await response.text()"));
});

expectFail("missing-no-raw-capture-note", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("No POST, no hosted writeback, no env mutation, no raw bodies or headers stored.", "Hosted probe summary."));
});

expectFail("missing-forbidden-secret-scan", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace("BLOB_READ_WRITE_TOKEN|", ""));
});

expectFail("missing-privileged-shape-summary", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace(/privilegedShapeFound/g, "privilegedShapeSeen"));
});

expectFail("missing-fail-closed-privileged-shape-exit", (fixtureRoot) => {
  writeFixture(fixtureRoot, readFixture(fixtureRoot).replace(" || result.forbiddenPatternFound || result.privilegedShapeFound", ""));
});

if (failures.length) {
  console.error("Hosted read-only probe guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Hosted read-only probe guard self-test passed.");
