#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

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

function diskObservedFor(targetRoot) {
  const source = execFileSync("df", ["-k", targetRoot], { encoding: "utf8" });
  const freeKiB = Number(source.trim().split(/\r?\n/)[1].trim().split(/\s+/)[3]);
  return `${Math.floor(freeKiB / 1024 / 1024)} GiB`;
}

function syncFixtureDiskObservation(targetRoot) {
  const latest = diskObservedFor(targetRoot);
  const textFiles = [
    "docs/runs/evidence/2026-06-15/02-local-baseline-checks.md",
    "docs/runs/evidence/2026-06-15/08-durable-state-proof.md",
    "docs/runs/evidence/2026-06-15/11-friday-readiness-report.md",
    "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md",
    "docs/runs/daily-checkpoint-2026-06-15.md"
  ];
  for (const relativePath of textFiles) {
    const fullPath = path.join(targetRoot, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const source = fs.readFileSync(fullPath, "utf8")
      .replace(/reported \d+ GiB free/g, `reported ${latest} free`)
      .replace(/reports \d+ GiB free/g, `reports ${latest} free`);
    fs.writeFileSync(fullPath, source);
  }

  const blockersPath = path.join(targetRoot, "docs/runs/evidence/2026-06-15/open-blockers.json");
  if (fs.existsSync(blockersPath)) {
    const matrix = JSON.parse(fs.readFileSync(blockersPath, "utf8"));
    matrix.localOperationalFollowUps = (matrix.localOperationalFollowUps || []).map((item) => item.id === "safe-lane-disk-headroom"
      ? { ...item, latestObserved: latest }
      : item);
    fs.writeFileSync(blockersPath, `${JSON.stringify(matrix, null, 2)}\n`);
  }
}

function fixtureRoot(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyRepo(targetRoot);
  syncFixtureDiskObservation(targetRoot);
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

function mutateJson(targetRoot, relativePath, mutate) {
  const data = JSON.parse(read(targetRoot, relativePath));
  write(targetRoot, relativePath, `${JSON.stringify(mutate(data), null, 2)}\n`);
}

expectPass("current-evidence-packet");

expectFail("missing-warning-classification", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace(
    "Warning classification:",
    "Warning notes:"
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

expectFail("durable-state-stale-disk-observed", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/08-durable-state-proof.md", (source) => source.replace(
    /recorded .*? reports \d+ GiB free/i,
    "recorded `df -g .` observation reports 999 GiB free"
  ));
});

expectFail("stale-local-proof-stamp", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/10-final-qa-summary.md", (source) => source.replaceAll(
    "2026-06-16T13:46:56Z",
    "2026-06-15T10:02:08Z"
  ));
});

expectFail("stale-browser-qa-failure-in-local-baseline", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/02-local-baseline-checks.md", (source) => `${source}\nCurrent browser QA is not green: the latest self-owned run fails with UI/harness assertions.\n`);
});

expectFail("browser-qa-report-timestamp-drives-doc-checks", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    checkedAt: "2099-01-01T00:00:00.000Z"
  }));
});

expectFail("browser-qa-report-missing-checked-at", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => {
    delete report.checkedAt;
    return report;
  });
});

expectFail("browser-qa-report-page-count-drift", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    pages: 19
  }));
});

expectFail("browser-qa-report-screenshot-count-drift", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    screenshots: report.screenshots.slice(0, 31)
  }));
});

expectFail("browser-qa-report-unsafe-screenshot-path", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    screenshots: report.screenshots.map((name, index) => index === 0 ? "../secrets.png" : name)
  }));
});

expectFail("browser-qa-report-unexpected-screenshot-name", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    screenshots: report.screenshots.map((name, index) => index === 0 ? "guide-desktop.png" : name)
  }));
});

expectFail("browser-qa-report-duplicate-screenshot-name", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    screenshots: report.screenshots.map((name, index) => index === 1 ? report.screenshots[0] : name)
  }));
});

expectFail("browser-qa-stale-screenshot-path-copy", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md", (source) => source.replace(
    "screenshot PNGs under `docs/screenshots/`",
    "screenshots under `docs/screenshots/qa/`"
  ));
});

expectFail("browser-qa-report-viewport-count-drift", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    viewports: report.viewports.filter((viewport) => viewport !== 320)
  }));
});

expectFail("browser-qa-report-failure-drift", (targetRoot) => {
  mutateJson(targetRoot, "docs/screenshots/qa/browser-qa-report.json", (report) => ({
    ...report,
    failures: [
      {
        page: "/library",
        viewport: 1440,
        reason: "fixture regression"
      }
    ]
  }));
});

expectFail("evidence-folder-daily-not-superseded", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/daily-checkpoint-2026-06-15.md", (source) => source.replace(
    "Historical Checkpoint Snapshot - Superseded",
    "Codex Daily Checkpoint - 2026-06-15"
  ));
});

expectFail("focused-ui-scratch-not-classified-as-ignored-local", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/screenshots/README.md", (source) => source.replace(
    "ignored local focused-UI-polish output",
    "focused-UI-polish output"
  ));
});

expectFail("missing-focused-ui-scratch-ignore-rule", (targetRoot) => {
  mutateFile(targetRoot, ".gitignore", (source) => source.replace(
    "docs/screenshots/focused-ui-polish-*/\n",
    ""
  ));
});

expectFail("missing-primitive-proof-allow-rule", (targetRoot) => {
  mutateFile(targetRoot, ".gitignore", (source) => source.replace(
    "!docs/screenshots/primitive-proof/*.png\n",
    ""
  ));
});

expectFail("missing-tracked-browser-qa-wrapper-boundary", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md", (source) => source.replace(
    "required browser QA owned-server wrapper files must be tracked by Git",
    "browser QA owned-server wrapper files exist locally"
  ));
});

expectFail("team-beta-packet-stale-warning-count", (targetRoot) => {
  mutateFile(targetRoot, "docs/team-beta-go-no-go-packet.md", (source) => source.replace("`warnings=2`", "`warnings=3`"));
});

expectFail("team-beta-packet-stale-local-port", (targetRoot) => {
  mutateFile(targetRoot, "docs/team-beta-go-no-go-packet.md", (source) => source.replaceAll(
    "localhost:4867",
    "localhost:4868"
  ));
});

expectFail("primary-evidence-stale-local-port", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/00-hali-dependencies.md", (source) => source.replace(
    "http://localhost:4871",
    "http://localhost:4868"
  ));
});

expectFail("false-go-readiness", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/11-friday-readiness-report.md", (source) => source.replace(
    "Decision recommendation: NO-GO",
    "Decision recommendation: GO"
  ));
});

expectFail("false-beta-ready-verdict", (targetRoot) => {
  mutateFile(targetRoot, "docs/runs/evidence/2026-06-15/10-final-qa-summary.md", (source) => source.replace(
    "Final verdict: **Not beta ready**.",
    "Final verdict: **Beta ready with limitations**."
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

expectFail("launch-readiness-fixed-temp-output", (targetRoot) => {
  mutateFile(targetRoot, "scripts/launch-readiness.sh", (source) => source.replace(
    ">${RUN_TMP_DIR}/tjc-live-dam-surface-guard.txt 2>&1",
    ">/tmp/tjc-live-dam-surface-guard.txt 2>&1"
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

expectFail("missing-hosted-readonly-probe-make-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "Makefile", (source) => source.replace(
    "\tSAFE_LANE_HEADROOM_CONTEXT=portal-hosted-readonly-probe node scripts/safe-lane-headroom-guard.mjs\n",
    ""
  ));
});

expectFail("missing-hosted-readonly-probe-direct-headroom-guard", (targetRoot) => {
  mutateFile(targetRoot, "scripts/portal-hosted-readonly-probe.mjs", (source) => source.replace(
    "SAFE_LANE_HEADROOM_CONTEXT: process.env.SAFE_LANE_HEADROOM_CONTEXT || \"portal-hosted-readonly-probe\"",
    "UNSAFE_CONTEXT: \"portal-hosted-readonly-probe\""
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
