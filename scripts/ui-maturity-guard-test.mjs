#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/ui-maturity-guard.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-ui-maturity-guard-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

const fixtureFiles = [
  "frontend/components/dam/enterprise/LibraryPage.tsx",
  "frontend/components/dam/enterprise/EnterpriseShared.tsx",
  "frontend/components/dam/enterprise/ReviewPage.tsx",
  "frontend/app/dam-enterprise.css",
  "frontend/components/RoleProvider.tsx",
  "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md"
];

function copyFixtureTree(targetRoot) {
  for (const relativePath of fixtureFiles) {
    const source = path.join(root, relativePath);
    const target = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  fs.writeFileSync(path.join(targetRoot, relativePath), source);
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyFixtureTree(targetRoot);
  return targetRoot;
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: targetRoot,
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
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

expectPass("current-ui-maturity");

expectFail("quick-look-selected-regression", (targetRoot) => {
  const file = "frontend/components/dam/enterprise/LibraryPage.tsx";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture: Quick lookSelected\n`);
});

expectFail("missing-download-lock-copy", (targetRoot) => {
  const file = "frontend/components/dam/enterprise/EnterpriseShared.tsx";
  write(targetRoot, file, read(targetRoot, file).replace("Open the full record to run the approved-copy gate", "Open full record"));
});

expectFail("missing-preview-redaction-note", (targetRoot) => {
  const file = "frontend/components/dam/enterprise/ReviewPage.tsx";
  write(targetRoot, file, read(targetRoot, file).replace("Role-safe derivative only. Source/original hidden.", "Preview"));
});

expectFail("client-node-env-regression", (targetRoot) => {
  const file = "frontend/components/RoleProvider.tsx";
  write(targetRoot, file, `${read(targetRoot, file)}\nconst badClientRuntimeCheck = process.env.NODE_ENV;\n`);
});

expectFail("missing-evidence-row", (targetRoot) => {
  const file = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
  write(targetRoot, file, read(targetRoot, file).replace("Review Queue premium workflow/redaction pass", "Review Queue workflow"));
});

if (failures.length) {
  console.error("UI maturity guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("UI maturity guard self-test passed.");
