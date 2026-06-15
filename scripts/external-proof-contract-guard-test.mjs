#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-external-proof-contract-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyRepo(targetRoot) {
  fs.cpSync(root, targetRoot, {
    recursive: true,
    filter(source) {
      const relative = path.relative(root, source);
      if (!relative) return true;
      const parts = relative.split(path.sep);
      return ![".git", ".next", ".runtime", "node_modules"].includes(parts[0]) && !parts.includes("node_modules") && !parts.includes(".next");
    }
  });
}

function fixtureRoot(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyRepo(targetRoot);
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  fs.writeFileSync(path.join(targetRoot, relativePath), source);
}

function mutateFile(targetRoot, relativePath, mutate) {
  write(targetRoot, relativePath, mutate(read(targetRoot, relativePath)));
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, ["scripts/external-proof-contract-guard.mjs"], {
    cwd: targetRoot,
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  const targetRoot = fixtureRoot(label);
  if (mutate) mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const targetRoot = fixtureRoot(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-external-proof-contract");

expectFail("canonical-overclaims-pass", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/01-canonical-repo-deploy.md", (source) => source.replace("| Result | BLOCKED for beta readiness |", "| Result | PASS |"));
});

expectFail("hosted-missing-mutation-boundary", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/03-hosted-access-proof.md", (source) => source.replace("hosted mutating smokes intentionally not run", "hosted checks complete"));
});

expectFail("resourcespace-overclaims-proof", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/04-resourcespace-read-proof.md", (source) => `${source}\nResourceSpace proof is complete.\n`);
});

expectFail("drive-missing-sanitized-manifest", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/06-google-drive-custody-proof.md", (source) => source.replace("Sanitized Custody Manifest Format", "Custody Notes"));
});

expectFail("durable-fake-env-warning-removed", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace("Creating fake env/config files would weaken the proof", "Local env proof accepted"));
});

expectFail("beta-packet-invite-send-overclaim", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/09-beta-packet.md", (source) => `${source}\nReady to send teammate invites.\n`);
});

expectFail("matrix-hosted-access-overclaims-pass", (targetRoot) => {
  const relativePath = "docs/runs/evidence/2026-06-15/open-blockers.json";
  const matrix = JSON.parse(read(targetRoot, relativePath));
  matrix.blockers = matrix.blockers.map((blocker) => blocker.id === "hosted-access-protection" ? { ...blocker, status: "blocked" } : blocker);
  write(targetRoot, relativePath, `${JSON.stringify(matrix, null, 2)}\n`);
});

if (failures.length) {
  console.error("External proof contract guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("External proof contract guard self-test passed.");
