#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/private-source-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-private-source-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyFixture(targetRoot) {
  fs.mkdirSync(path.join(targetRoot, "frontend"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/lib"), path.join(targetRoot, "frontend/lib"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/app"), path.join(targetRoot, "frontend/app"), { recursive: true });
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  copyFixture(targetRoot);
  return targetRoot;
}

function write(targetRoot, relativePath, source) {
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      PRIVATE_SOURCE_GUARD_ROOT: targetRoot
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
  const targetRoot = fixturePath(label);
  if (mutate) mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const targetRoot = fixturePath(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("ad-hoc-dotdot-traversal-regression", (targetRoot) => {
  write(targetRoot, "frontend/app/api/regression/route.ts", 'export const bad = path.includes("..");\n');
});

expectFail("ad-hoc-http-url-regression", (targetRoot) => {
  write(targetRoot, "frontend/lib/regression-url.ts", "export const bad = /^https?:\\/\\//;\n");
});

expectFail("ad-hoc-token-regex-regression", (targetRoot) => {
  write(targetRoot, "frontend/lib/regression-token.ts", "export const bad = /[a-f0-9]{32,}/;\n");
});

expectFail("reviewer-text-sanitizer-regression", (targetRoot) => {
  const file = "frontend/lib/review-evidence-packet.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\nfunction safeDisplayText(value: string) { return value.trim(); }\n`);
});

expectFail("reviewer-normalization-missing", (targetRoot) => {
  const file = "frontend/lib/review-evidence-packet.ts";
  write(targetRoot, file, read(targetRoot, file).replace(/normalizeDisplayTextField/g, "normalizeTextFieldRegression"));
});

if (failures.length) {
  console.error("Private source guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Private source guard self-test passed.");
