#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const guardPath = path.join(root, "scripts/evidence-packet-guard.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-evidence-packet-guard-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyRepo(targetRoot) {
  fs.cpSync(root, targetRoot, {
    recursive: true,
    filter(source) {
      const relative = path.relative(root, source);
      if (!relative) return true;
      const parts = relative.split(path.sep);
      return ![
        ".git",
        ".next",
        ".runtime",
        "node_modules",
        "frontend/node_modules",
        "frontend/.next"
      ].includes(parts[0]) && !parts.includes("node_modules") && !parts.includes(".next");
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

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [path.join(targetRoot, "scripts/evidence-packet-guard.mjs")], {
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

function mutateFile(targetRoot, relativePath, mutate) {
  write(targetRoot, relativePath, mutate(read(targetRoot, relativePath)));
}

expectPass("current-evidence-packet");

expectFail("missing-warning-classification", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace(
    /Warning classification:[\s\S]*?\nLocal smokes proved/,
    "Local smokes proved"
  ));
});

expectFail("env-warning-overclaimed", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace(
    "| `.env missing` | blocker for hosted/durable beta proof |",
    "| `.env missing` | acceptable beta limitation |"
  ));
});

expectFail("backups-warning-overclaimed", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace(
    "| `.runtime/backups missing` | blocker for backup/restore proof |",
    "| `.runtime/backups missing` | follow-up |"
  ));
});

expectFail("stale-local-proof-stamp", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/10-final-qa-summary.md", (source) => source.replaceAll(
    "2026-06-15T12:14:57Z",
    "2026-06-15T10:02:08Z"
  ));
});

expectFail("team-beta-packet-stale-warning-count", (targetRoot) => {
  mutateFile(targetRoot, "docs/team-beta-go-no-go-packet.md", (source) => source
    .replace("`warnings=3`", "`warnings=2`")
    .replace(", and `local free disk below 10 GiB`", ""));
});

expectFail("team-beta-packet-stale-local-port", (targetRoot) => {
  mutateFile(targetRoot, "docs/team-beta-go-no-go-packet.md", (source) => source.replaceAll(
    "localhost:4871",
    "localhost:4868"
  ));
});

expectFail("false-go-readiness", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/11-friday-readiness-report.md", (source) => source.replace(
    "Decision recommendation: NO-GO",
    "Decision recommendation: GO"
  ));
});

expectFail("hosted-summary-privileged-shape", (targetRoot) => {
  const relativePath = "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json";
  const summary = JSON.parse(read(targetRoot, relativePath));
  summary.results[0].privilegedShapeFound = true;
  write(targetRoot, relativePath, `${JSON.stringify(summary, null, 2)}\n`);
});

expectFail("hosted-summary-missing-privileged-shape-flag", (targetRoot) => {
  const relativePath = "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json";
  const summary = JSON.parse(read(targetRoot, relativePath));
  delete summary.results[0].privilegedShapeFound;
  write(targetRoot, relativePath, `${JSON.stringify(summary, null, 2)}\n`);
});

expectFail("missing-local-smoke-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\tSAFE_LANE_HEADROOM_CONTEXT=portal-api-smoke node scripts/safe-lane-headroom-guard.mjs\n",
    ""
  ));
});

expectFail("missing-frontend-check-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/frontend-check.sh", (source) => source.replace(
    'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-frontend-check}" node scripts/safe-lane-headroom-guard.mjs\n\n',
    ""
  ));
});

expectFail("missing-frontend-dev-make-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\tSAFE_LANE_HEADROOM_CONTEXT=frontend-dev node scripts/safe-lane-headroom-guard.mjs\n",
    ""
  ));
});

expectFail("missing-frontend-predev-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "frontend/package.json", (source) => source.replace(
    '"predev": "SAFE_LANE_HEADROOM_CONTEXT=dev-server node ../scripts/safe-lane-headroom-guard.mjs",',
    '"predev": "node -e \\"process.exit(0)\\"",'
  ));
});

expectFail("missing-portal-browser-qa-make-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\tSAFE_LANE_HEADROOM_CONTEXT=portal-browser-qa node scripts/safe-lane-headroom-guard.mjs\n",
    ""
  ));
});

expectFail("missing-bootstrap-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/bootstrap-official-docker.sh", (source) => source.replace(
    'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-bootstrap}" node scripts/safe-lane-headroom-guard.mjs\n\n',
    ""
  ));
});

expectFail("missing-import-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\tSAFE_LANE_HEADROOM_CONTEXT=import-mvp-batch node scripts/safe-lane-headroom-guard.mjs\n",
    ""
  ));
});

expectFail("missing-direct-import-script-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/import-mvp-batch.sh", (source) => source.replace(
    'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-import-mvp-batch}" node scripts/safe-lane-headroom-guard.mjs\n',
    ""
  ));
});

expectFail("missing-direct-portal-helper-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/portal-smoke-trusted-identity.sh", (source) => source.replace(
    '  SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-smoke}" node scripts/safe-lane-headroom-guard.mjs\n',
    ""
  ));
});

expectFail("missing-python-stage-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/stage-batch-masters.py", (source) => source.replace(
    '    run_headroom_guard("stage-batch-masters")\n\n',
    ""
  ));
});

expectFail("missing-temp-fixture-cleanup", (targetRoot) => {
  mutateFile(targetRoot, "scripts/api-identity-guard-test.mjs", (source) => source.replace(
    'process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));\n',
    ""
  ));
});

expectFail("missing-team-beta-signoff-make-target", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\nteam-beta-signoff-guard-test:\n\tnode scripts/team-beta-signoff-guard-test.mjs\n",
    ""
  ));
});

if (failures.length) {
  console.error("Evidence packet guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Evidence packet guard self-test passed.");
