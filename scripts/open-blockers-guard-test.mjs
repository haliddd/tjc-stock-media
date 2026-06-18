#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const guardPath = path.join(root, "scripts/open-blockers-guard.mjs");
const baseMatrix = JSON.parse(fs.readFileSync(path.join(root, "docs/runs/evidence/2026-06-15/open-blockers.json"), "utf8"));
const baseHostedSummary = JSON.parse(fs.readFileSync(path.join(root, "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json"), "utf8"));
const baseBrowserQaReport = JSON.parse(fs.readFileSync(path.join(root, "docs/screenshots/qa/browser-qa-report.json"), "utf8"));
const diskParts = execFileSync("df", ["-k", root], { encoding: "utf8" }).trim().split(/\r?\n/)[1].trim().split(/\s+/);
const totalDiskGiB = Math.floor(Number(diskParts[1]) / 1024 / 1024);
const impossibleDiskObserved = `${totalDiskGiB + 1} GiB`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-open-blockers-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempDir, { recursive: true, force: true }));

function fixturePath(label) {
  return path.join(tempDir, `${label}.json`);
}

function writeFixture(label, matrix) {
  const filePath = fixturePath(label);
  fs.writeFileSync(filePath, `${JSON.stringify(matrix, null, 2)}\n`);
  return filePath;
}

function writeHostedSummaryFixture(label, summary) {
  const filePath = path.join(tempDir, `${label}-hosted-summary.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`);
  return filePath;
}

function writeBrowserQaReportFixture(label, report) {
  const filePath = path.join(tempDir, `${label}-browser-qa-report.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

function runGuard(filePath, env = {}) {
  return spawnSync(process.execPath, [guardPath, filePath], {
    cwd: root,
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf8"
  });
}

function expectPass(label, matrix) {
  const result = runGuard(writeFixture(label, matrix));
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, matrix) {
  const result = runGuard(writeFixture(label, matrix));
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

function expectFailWithHostedSummary(label, matrix, summary) {
  const result = runGuard(writeFixture(label, matrix), {
    OPEN_BLOCKERS_HOSTED_SUMMARY_PATH: writeHostedSummaryFixture(label, summary)
  });
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

function expectFailWithBrowserQaReport(label, matrix, report) {
  const result = runGuard(writeFixture(label, matrix), {
    OPEN_BLOCKERS_BROWSER_QA_REPORT_PATH: writeBrowserQaReportFixture(label, report)
  });
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-no-go-matrix", baseMatrix);

expectFail("false-go-decision", {
  ...baseMatrix,
  decision: "GO",
  blockers: baseMatrix.blockers.map((blocker) => ({ ...blocker, status: "resolved" }))
});

expectFail("false-beta-ready-verdict", {
  ...baseMatrix,
  finalVerdict: "Beta ready with limitations"
});

expectFail("missing-local-proof-summary", {
  ...baseMatrix,
  localProofSummary: undefined
});

expectFail("browser-qa-summary-overclaim", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    browserQa: {
      ...baseMatrix.localProofSummary.browserQa,
      failures: 1
    }
  }
});

expectFail("browser-qa-summary-page-count-overclaim", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    browserQa: {
      ...baseMatrix.localProofSummary.browserQa,
      pages: 21
    }
  }
});

expectFail("browser-qa-summary-viewport-count-overclaim", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    browserQa: {
      ...baseMatrix.localProofSummary.browserQa,
      viewports: 7
    }
  }
});

expectFail("browser-qa-summary-screenshot-count-overclaim", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    browserQa: {
      ...baseMatrix.localProofSummary.browserQa,
      screenshots: 33
    }
  }
});

expectFail("runtime-smoke-target-missing-sso", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    runtimeSmokes: {
      ...baseMatrix.localProofSummary.runtimeSmokes,
      targets: baseMatrix.localProofSummary.runtimeSmokes.targets.filter((target) => target !== "portal-sso-smoke")
    }
  }
});

expectFail("runtime-smoke-target-missing-usage", {
  ...baseMatrix,
  localProofSummary: {
    ...baseMatrix.localProofSummary,
    runtimeSmokes: {
      ...baseMatrix.localProofSummary.runtimeSmokes,
      targets: baseMatrix.localProofSummary.runtimeSmokes.targets.filter((target) => target !== "portal-usage-smoke")
    }
  }
});

expectFail("missing-canonical-blocker", {
  ...baseMatrix,
  blockers: baseMatrix.blockers.filter((blocker) => blocker.id !== "canonical-deployment")
});

expectFail("hosted-access-overclaim", {
  ...baseMatrix,
  blockers: baseMatrix.blockers.map((blocker) => blocker.id === "hosted-access-protection"
    ? { ...blocker, status: "pass" }
    : blocker)
});

expectFail("missing-forbidden-surface", {
  ...baseMatrix,
  forbiddenSurfacesNotTouched: baseMatrix.forbiddenSurfacesNotTouched.filter((surface) => surface !== "Google Drive originals")
});

expectFail("missing-disk-follow-up", {
  ...baseMatrix,
  localOperationalFollowUps: []
});

expectFail("impossible-disk-latest-observed", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, latestObserved: impossibleDiskObserved }
    : item)
});

expectFail("low-disk-latest-observed", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, latestObserved: "9 GiB" }
    : item)
});

expectFail("unsafe-disk-follow-up-boundary", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, safeNextStep: "Clean old files." }
    : item)
});

expectFail("missing-disk-follow-up-override-boundary", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, safeNextStep: item.safeNextStep.replace(" Lowering SAFE_LANE_MIN_FREE_GIB for a focused safe command requires SAFE_LANE_HEADROOM_OVERRIDE_REASON.", "") }
    : item)
});

expectFail("missing-disk-cleanup-insufficiency-boundary", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, safeNextStep: item.safeNextStep.replace(" safe isolated cleanup may not be enough for default 10 GiB headroom when low disk recurs.", "") }
    : item)
});

expectFail("missing-smoke-rerun-block-scope", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, blocks: item.blocks.filter((block) => block !== "long-local-dev-build-start-browser-smoke-reruns") }
    : item)
});

expectFail("missing-bootstrap-docker-rerun-block-scope", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, blocks: item.blocks.filter((block) => block !== "long-local-dev-build-start-browser-smoke-bootstrap-docker-reruns") }
    : item)
});

expectFail("missing-import-media-backup-rerun-block-scope", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, blocks: item.blocks.filter((block) => block !== "long-local-dev-build-start-browser-smoke-bootstrap-docker-import-media-backup-reruns") }
    : item)
});

expectFail("stale-hosted-read-only-proof", {
  ...baseMatrix,
  latestHostedReadOnlyProofAt: "2026-06-15T09:22:54.152Z"
});

expectFailWithHostedSummary("hosted-summary-timestamp-mismatch", baseMatrix, {
  ...baseHostedSummary,
  checkedAt: "2099-01-01T00:00:00.000Z"
});

expectFailWithHostedSummary("hosted-summary-missing-checked-at", baseMatrix, {
  ...baseHostedSummary,
  checkedAt: ""
});

expectFailWithBrowserQaReport("browser-qa-report-timestamp-mismatch", baseMatrix, {
  ...baseBrowserQaReport,
  checkedAt: "2099-01-01T00:00:00.000Z"
});

expectFailWithBrowserQaReport("browser-qa-report-missing-checked-at", baseMatrix, {
  ...baseBrowserQaReport,
  checkedAt: ""
});

expectFailWithBrowserQaReport("browser-qa-report-failures-present", baseMatrix, {
  ...baseBrowserQaReport,
  failures: [
    {
      page: "/library",
      viewport: "desktop",
      reason: "fixture regression"
    }
  ]
});

expectFailWithBrowserQaReport("browser-qa-report-page-count-drift", baseMatrix, {
  ...baseBrowserQaReport,
  pages: 19
});

expectFailWithBrowserQaReport("browser-qa-report-viewport-count-drift", baseMatrix, {
  ...baseBrowserQaReport,
  viewports: baseBrowserQaReport.viewports.slice(0, 5)
});

expectFailWithBrowserQaReport("browser-qa-report-screenshot-count-drift", baseMatrix, {
  ...baseBrowserQaReport,
  screenshots: baseBrowserQaReport.screenshots.slice(0, 31)
});

expectFail("stale-browser-qa-proof", {
  ...baseMatrix,
  latestLocalBrowserQaProofAt: "2026-06-16T02:59:06.306Z"
});

expectFail("stale-browser-qa-attempt", {
  ...baseMatrix,
  latestLocalBrowserQaAttemptAt: "2026-06-16T09:51:36.757Z"
});

expectFail("stale-browser-qa-current-fail-follow-up", {
  ...baseMatrix,
  localOperationalFollowUps: [
    ...baseMatrix.localOperationalFollowUps,
    {
      id: "browser-qa-current-fail",
      status: "follow-up",
      owner: "proof lane",
      evidenceDoc: "docs/runs/evidence/2026-06-15/10-final-qa-summary.md",
      currentSignal: "current browser QA FAIL: 44 failures, 0 console/network/warnings",
      latestObserved: "2026-06-16T09:51:36.757Z",
      safeNextStep: "Use docs/screenshots/qa/browser-qa-report.json from 2026-06-16T09:51:36.757Z as current browser QA truth.",
      blocks: ["current-browser-qa-green-proof", "browser-qa-based-beta-ready-claim"]
    }
  ]
});

expectFail("missing-required-proof", {
  ...baseMatrix,
  blockers: baseMatrix.blockers.map((blocker) => blocker.id === "durable-hosted-state"
    ? { ...blocker, requiredProof: "" }
    : blocker)
});

if (failures.length) {
  console.error("Open blockers guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Open blockers guard self-test passed.");
