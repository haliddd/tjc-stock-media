#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/completion-audit-guard.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-completion-audit-guard-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

const fixtureFiles = [
  "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md",
  "docs/runs/evidence/2026-06-15/open-blockers.json"
];

function copyFixtures(targetRoot) {
  for (const relativePath of fixtureFiles) {
    const source = path.join(root, relativePath);
    const target = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyFixtures(targetRoot);
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  fs.writeFileSync(path.join(targetRoot, relativePath), source);
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

function mutateLedger(targetRoot, mutate) {
  const file = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
  write(targetRoot, file, mutate(read(targetRoot, file)));
}

function mutateBlockers(targetRoot, mutate) {
  const file = "docs/runs/evidence/2026-06-15/open-blockers.json";
  const matrix = JSON.parse(read(targetRoot, file));
  write(targetRoot, file, `${JSON.stringify(mutate(matrix), null, 2)}\n`);
}

expectPass("current-completion-audit");

expectFail("false-complete-decision", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "Audit decision: do not mark the overall goal complete.",
    "Audit decision: complete."
  ));
});

expectFail("missing-completion-audit-section", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace("## Completion Audit", "## Completion Summary"));
});

expectFail("canonical-blocker-overclaimed", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "| Canonical repo/deploy/commit locked | `01-canonical-repo-deploy.md` | BLOCKED |",
    "| Canonical repo/deploy/commit locked | `01-canonical-repo-deploy.md` | PASS local |"
  ));
});

expectFail("missing-external-dependency-warning", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "full objective still depends on external hosted/canonical/ResourceSpace/Drive/durable/tester approval evidence",
    "full objective is done"
  ));
});

expectFail("missing-evidence-packet-self-test-proof", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replaceAll(
    "; `evidence-packet-guard-test`",
    ""
  ).replaceAll(
    "| `make evidence-packet-guard-test` | PASS |\n",
    ""
  ));
});

expectFail("missing-disk-headroom-follow-up", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("| Local disk headroom for long autonomous lane |"))
    .join("\n"));
});

expectFail("missing-disk-headroom-override-reason-boundary", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "any focused threshold override requires `SAFE_LANE_HEADROOM_OVERRIDE_REASON`; ",
    ""
  ));
});

expectFail("missing-disk-headroom-cleanup-insufficiency", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "current report shows safe isolated cleanup alone is not enough for default headroom; ",
    ""
  ));
});

expectFail("blocker-matrix-false-go", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    decision: "GO"
  }));
});

expectFail("hosted-access-overclaimed", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    blockers: matrix.blockers.map((blocker) => blocker.id === "hosted-access-protection"
      ? { ...blocker, status: "pass" }
      : blocker)
  }));
});

expectFail("missing-durable-blocker", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    blockers: matrix.blockers.filter((blocker) => blocker.id !== "durable-hosted-state")
  }));
});

if (failures.length) {
  console.error("Completion audit guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Completion audit guard self-test passed.");
