#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const matrixPath = process.argv[2] || "docs/runs/evidence/2026-06-15/open-blockers.json";
const evidenceDir = "docs/runs/evidence/2026-06-15";
const expectedWorktree = "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedBranch = "codex/safe-ui-beta-proof-2026-06-15";
const expectedBaseUrl = "http://localhost:4871";
const expectedCheckedAt = "2026-06-16T13:46:56Z";
const browserQaReportPath = process.env.OPEN_BLOCKERS_BROWSER_QA_REPORT_PATH
  || "docs/screenshots/qa/browser-qa-report.json";
const hostedSummaryPath = process.env.OPEN_BLOCKERS_HOSTED_SUMMARY_PATH
  || path.join(evidenceDir, "hosted-readonly-probes", "summary.json");
const diskParts = execFileSync("df", ["-k", root], { encoding: "utf8" }).trim().split(/\r?\n/)[1].trim().split(/\s+/);
const diskTotalGiB = Math.floor(Number(diskParts[1]) / 1024 / 1024);
const minSafeDiskGiB = 10;
const failures = [];

const expectedBlockers = new Map([
  ["canonical-deployment", "blocked"],
  ["hosted-access-protection", "partial"],
  ["vercel-env-confirmation", "blocked"],
  ["resourcespace-scope", "blocked"],
  ["google-drive-custody", "blocked"],
  ["durable-hosted-state", "blocked"],
  ["tester-list-and-signoff", "blocked"]
]);

const forbiddenSurfaces = [
  "Vercel prod env",
  "ResourceSpace prod data",
  "Google Drive originals",
  "DNS",
  "billing",
  "live writeback",
  "tester invites",
  "public launch",
  "source media"
];

function readJson(relativePath) {
  const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing blocker matrix: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function requireString(value, label) {
  if (!String(value || "").trim()) failures.push(`${label} must be non-empty`);
}

function parseGiB(value) {
  const match = String(value || "").match(/^(\d+) GiB$/);
  return match ? Number(match[1]) : null;
}

const matrix = readJson(matrixPath);
const hostedSummary = readJson(hostedSummaryPath);
const expectedHostedReadOnlyProofAt = hostedSummary?.checkedAt || "";
if (!expectedHostedReadOnlyProofAt) failures.push(`${hostedSummaryPath} must include checkedAt`);
const browserQaReport = readJson(browserQaReportPath);
const expectedBrowserQaProofAt = browserQaReport?.checkedAt || "";
const expectedBrowserQaAttemptAt = expectedBrowserQaProofAt;
if (!expectedBrowserQaProofAt) failures.push(`${browserQaReportPath} must include checkedAt`);
const expectedBrowserQaPages = browserQaReport?.pages;
const expectedBrowserQaViewports = Array.isArray(browserQaReport?.viewports) ? browserQaReport.viewports.length : undefined;
const expectedBrowserQaScreenshots = Array.isArray(browserQaReport?.screenshots) ? browserQaReport.screenshots.length : undefined;
const expectedBrowserQaFailures = Array.isArray(browserQaReport?.failures) ? browserQaReport.failures.length : undefined;
const expectedBrowserQaConsoleErrors = Array.isArray(browserQaReport?.consoleErrors) ? browserQaReport.consoleErrors.length : undefined;
const expectedBrowserQaNetworkFailures = Array.isArray(browserQaReport?.networkFailures) ? browserQaReport.networkFailures.length : undefined;
const expectedBrowserQaWarnings = Array.isArray(browserQaReport?.warnings) ? browserQaReport.warnings.length : undefined;
if (expectedBrowserQaPages !== 20) failures.push(`${browserQaReportPath} pages must be 20`);
if (expectedBrowserQaViewports !== 6) failures.push(`${browserQaReportPath} viewports must be 6`);
if (expectedBrowserQaScreenshots !== 32) failures.push(`${browserQaReportPath} screenshots must be 32`);
for (const [label, value] of [
  ["failures", expectedBrowserQaFailures],
  ["consoleErrors", expectedBrowserQaConsoleErrors],
  ["networkFailures", expectedBrowserQaNetworkFailures],
  ["warnings", expectedBrowserQaWarnings]
]) {
  if (value !== 0) failures.push(`${browserQaReportPath} ${label} must be 0`);
}
if (matrix) {
  if (matrix.schema !== "tjc-stock-media-beta-open-blockers.v1") failures.push(`${matrixPath} has wrong schema`);
  if (matrix.decision !== "NO-GO") failures.push(`${matrixPath} decision must be NO-GO`);
  if (matrix.finalVerdict !== "Not beta ready") failures.push(`${matrixPath} finalVerdict must be Not beta ready`);
  if (matrix.worktree !== expectedWorktree) failures.push(`${matrixPath} worktree must be ${expectedWorktree}`);
  if (matrix.branch !== expectedBranch) failures.push(`${matrixPath} branch must be ${expectedBranch}`);
  if (matrix.baseUrl !== expectedBaseUrl) failures.push(`${matrixPath} baseUrl must be ${expectedBaseUrl}`);
  requireString(matrix.checkedAt, `${matrixPath} checkedAt`);
  if (matrix.checkedAt !== expectedCheckedAt) failures.push(`${matrixPath} checkedAt must match latest protected proof timestamp ${expectedCheckedAt}`);
  if (matrix.latestLocalProtectedProofAt !== expectedCheckedAt) {
    failures.push(`${matrixPath} latestLocalProtectedProofAt must match ${expectedCheckedAt}`);
  }
  if (matrix.latestLocalBrowserQaProofAt !== expectedBrowserQaProofAt) {
    failures.push(`${matrixPath} latestLocalBrowserQaProofAt must match ${expectedBrowserQaProofAt}`);
  }
  if (matrix.latestLocalBrowserQaAttemptAt !== expectedBrowserQaAttemptAt) {
    failures.push(`${matrixPath} latestLocalBrowserQaAttemptAt must match ${expectedBrowserQaAttemptAt}`);
  }
  if (matrix.latestHostedReadOnlyProofAt !== expectedHostedReadOnlyProofAt) {
    failures.push(`${matrixPath} latestHostedReadOnlyProofAt must match ${expectedHostedReadOnlyProofAt}`);
  }
  requireString(matrix.decisionReason, `${matrixPath} decisionReason`);
  if (/beta ready/i.test(String(matrix.finalVerdict || "")) && matrix.finalVerdict !== "Not beta ready") {
    failures.push(`${matrixPath} finalVerdict must not claim beta ready while external blockers remain`);
  }

  if (!matrix.localProofSummary || typeof matrix.localProofSummary !== "object") {
    failures.push(`${matrixPath} localProofSummary must be present`);
  } else {
    const summary = matrix.localProofSummary;
    if (summary.launchReadiness?.status !== "pass") failures.push(`${matrixPath} localProofSummary.launchReadiness.status must be pass`);
    if (summary.launchReadiness?.failures !== 0) failures.push(`${matrixPath} localProofSummary.launchReadiness.failures must be 0`);
    if (summary.launchReadiness?.warnings !== 2) failures.push(`${matrixPath} localProofSummary.launchReadiness.warnings must be 2`);
    for (const warningId of [".env missing", ".runtime/backups missing"]) {
      if (!Array.isArray(summary.launchReadiness?.warningIds) || !summary.launchReadiness.warningIds.includes(warningId)) {
        failures.push(`${matrixPath} localProofSummary.launchReadiness.warningIds missing ${warningId}`);
      }
    }
    if (summary.browserQa?.status !== "pass") failures.push(`${matrixPath} localProofSummary.browserQa.status must be pass`);
    if (summary.browserQa?.checkedAt !== expectedBrowserQaProofAt) failures.push(`${matrixPath} localProofSummary.browserQa.checkedAt must match latest browser QA proof`);
    if (summary.browserQa?.pages !== expectedBrowserQaPages) failures.push(`${matrixPath} localProofSummary.browserQa.pages must match browser QA report`);
    if (summary.browserQa?.viewports !== expectedBrowserQaViewports) failures.push(`${matrixPath} localProofSummary.browserQa.viewports must match browser QA report`);
    if (summary.browserQa?.screenshots !== expectedBrowserQaScreenshots) failures.push(`${matrixPath} localProofSummary.browserQa.screenshots must match browser QA report`);
    for (const [key, value] of [
      ["failures", expectedBrowserQaFailures],
      ["consoleErrors", expectedBrowserQaConsoleErrors],
      ["networkFailures", expectedBrowserQaNetworkFailures],
      ["warnings", expectedBrowserQaWarnings]
    ]) {
      if (summary.browserQa?.[key] !== value) failures.push(`${matrixPath} localProofSummary.browserQa.${key} must match browser QA report`);
    }
    if (summary.frontend?.typecheck !== "pass") failures.push(`${matrixPath} localProofSummary.frontend.typecheck must be pass`);
    if (summary.frontend?.tests !== "pass") failures.push(`${matrixPath} localProofSummary.frontend.tests must be pass`);
    if (summary.frontend?.testFiles !== 9) failures.push(`${matrixPath} localProofSummary.frontend.testFiles must be 9`);
    if (summary.frontend?.testCount !== 86) failures.push(`${matrixPath} localProofSummary.frontend.testCount must be 86`);
    if (summary.frontend?.build !== "pass") failures.push(`${matrixPath} localProofSummary.frontend.build must be pass`);
    if (summary.runtimeSmokes?.status !== "pass") failures.push(`${matrixPath} localProofSummary.runtimeSmokes.status must be pass`);
    if (summary.runtimeSmokes?.baseUrl !== expectedBaseUrl) failures.push(`${matrixPath} localProofSummary.runtimeSmokes.baseUrl must be ${expectedBaseUrl}`);
    for (const target of [
      "portal-api-smoke",
      "portal-download-ticket-smoke",
      "portal-sso-smoke",
      "portal-delivery-smoke",
      "portal-feedback-smoke",
      "portal-package-smoke",
      "portal-saved-search-smoke",
      "portal-writeback-guard-smoke",
      "portal-usage-smoke",
      "portal-beta-rehearsal"
    ]) {
      if (!Array.isArray(summary.runtimeSmokes?.targets) || !summary.runtimeSmokes.targets.includes(target)) {
        failures.push(`${matrixPath} localProofSummary.runtimeSmokes.targets missing ${target}`);
      }
    }
  }

  if (!Array.isArray(matrix.forbiddenSurfacesNotTouched)) {
    failures.push(`${matrixPath} forbiddenSurfacesNotTouched must be an array`);
  } else {
    for (const surface of forbiddenSurfaces) {
      if (!matrix.forbiddenSurfacesNotTouched.includes(surface)) {
        failures.push(`${matrixPath} missing forbidden surface: ${surface}`);
      }
    }
  }

  if (!Array.isArray(matrix.localOperationalFollowUps)) {
    failures.push(`${matrixPath} localOperationalFollowUps must be an array`);
  } else {
    const followUpsById = new Map(matrix.localOperationalFollowUps.map((item) => [item.id, item]));
    const diskFollowUp = followUpsById.get("safe-lane-disk-headroom");
    const browserQaFollowUp = followUpsById.get("browser-qa-current-fail");
    if (browserQaFollowUp) {
      failures.push(`${matrixPath} must not keep stale browser-qa-current-fail follow-up after current browser QA PASS`);
    }
    if (!diskFollowUp) {
      failures.push(`${matrixPath} missing local operational follow-up safe-lane-disk-headroom`);
    } else {
      if (diskFollowUp.status !== "follow-up") failures.push(`${matrixPath} safe-lane-disk-headroom status must be follow-up`);
      if (diskFollowUp.owner !== "operator") failures.push(`${matrixPath} safe-lane-disk-headroom owner must be operator`);
      if (diskFollowUp.currentSignal !== "local free disk at least 10 GiB") failures.push(`${matrixPath} safe-lane-disk-headroom currentSignal must be local free disk at least 10 GiB`);
      const observedDiskGiB = parseGiB(diskFollowUp.latestObserved);
      if (observedDiskGiB === null) failures.push(`${matrixPath} safe-lane-disk-headroom latestObserved must be recorded in GiB`);
      if (observedDiskGiB !== null && observedDiskGiB < minSafeDiskGiB) {
        failures.push(`${matrixPath} safe-lane-disk-headroom latestObserved must be at least ${minSafeDiskGiB} GiB`);
      }
      if (observedDiskGiB !== null && observedDiskGiB > diskTotalGiB) {
        failures.push(`${matrixPath} safe-lane-disk-headroom latestObserved must not exceed filesystem total ${diskTotalGiB} GiB`);
      }
      if (diskFollowUp.evidenceDoc !== "docs/runs/evidence/2026-06-15/08-durable-state-proof.md") {
        failures.push(`${matrixPath} safe-lane-disk-headroom evidenceDoc must point at durable-state proof`);
      }
      for (const boundary of [
        "make safe-lane-disk-report",
        "never clean shared checkout",
        "source media",
        "prod/hosted surfaces",
        "evidence artifacts",
        "safe isolated cleanup may not be enough",
        "default 10 GiB headroom",
        "SAFE_LANE_HEADROOM_OVERRIDE_REASON"
      ]) {
        if (!String(diskFollowUp.safeNextStep || "").includes(boundary)) {
          failures.push(`${matrixPath} safe-lane-disk-headroom safeNextStep missing boundary: ${boundary}`);
        }
      }
      if (!Array.isArray(diskFollowUp.blocks) || !diskFollowUp.blocks.includes("long-local-dev-build-start-browser-reruns")) {
        failures.push(`${matrixPath} safe-lane-disk-headroom must block long-local-dev-build-start-browser-reruns`);
      }
      if (!Array.isArray(diskFollowUp.blocks) || !diskFollowUp.blocks.includes("long-local-dev-build-start-browser-smoke-reruns")) {
        failures.push(`${matrixPath} safe-lane-disk-headroom must block long-local-dev-build-start-browser-smoke-reruns`);
      }
      if (!Array.isArray(diskFollowUp.blocks) || !diskFollowUp.blocks.includes("long-local-dev-build-start-browser-smoke-bootstrap-docker-reruns")) {
        failures.push(`${matrixPath} safe-lane-disk-headroom must block long-local-dev-build-start-browser-smoke-bootstrap-docker-reruns`);
      }
      if (!Array.isArray(diskFollowUp.blocks) || !diskFollowUp.blocks.includes("long-local-dev-build-start-browser-smoke-bootstrap-docker-import-media-backup-reruns")) {
        failures.push(`${matrixPath} safe-lane-disk-headroom must block long-local-dev-build-start-browser-smoke-bootstrap-docker-import-media-backup-reruns`);
      }
    }
  }

  if (!Array.isArray(matrix.blockers)) {
    failures.push(`${matrixPath} blockers must be an array`);
  } else {
    const blockersById = new Map(matrix.blockers.map((blocker) => [blocker.id, blocker]));
    for (const [id, expectedStatus] of expectedBlockers) {
      const blocker = blockersById.get(id);
      if (!blocker) {
        failures.push(`${matrixPath} missing blocker ${id}`);
        continue;
      }
      if (blocker.status !== expectedStatus) {
        failures.push(`${matrixPath} blocker ${id} expected status ${expectedStatus}, got ${blocker.status}`);
      }
      requireString(blocker.owner, `${matrixPath} blocker ${id} owner`);
      requireString(blocker.requiredProof, `${matrixPath} blocker ${id} requiredProof`);
      requireString(blocker.safeNextStep, `${matrixPath} blocker ${id} safeNextStep`);
      if (!String(blocker.evidenceDoc || "").startsWith(`${evidenceDir}/`)) {
        failures.push(`${matrixPath} blocker ${id} evidenceDoc must point inside ${evidenceDir}`);
      } else if (!fs.existsSync(path.join(root, blocker.evidenceDoc))) {
        failures.push(`${matrixPath} blocker ${id} evidenceDoc does not exist: ${blocker.evidenceDoc}`);
      }
      if (!Array.isArray(blocker.blocks) || blocker.blocks.length === 0) {
        failures.push(`${matrixPath} blocker ${id} must list blocked decision surfaces`);
      }
    }
    for (const blocker of matrix.blockers) {
      if (!expectedBlockers.has(blocker.id)) failures.push(`${matrixPath} has unexpected blocker ${blocker.id}`);
      if (["resolved", "complete", "pass", "go"].includes(String(blocker.status || "").toLowerCase())) {
        failures.push(`${matrixPath} blocker ${blocker.id} must not claim resolved/pass/go while decision is NO-GO`);
      }
    }
  }
}

if (failures.length) {
  console.error("Open blockers guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Open blockers guard passed.");
