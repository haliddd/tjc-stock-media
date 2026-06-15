#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = process.argv[2] || "docs/runs/evidence/2026-06-15/open-blockers.json";
const evidenceDir = "docs/runs/evidence/2026-06-15";
const expectedWorktree = "/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run";
const expectedBranch = "codex/safe-ui-beta-proof-2026-06-15";
const expectedBaseUrl = "http://localhost:4871";
const expectedCheckedAt = "2026-06-15T12:14:57Z";
const expectedBrowserQaProofAt = "2026-06-15T13:27:23.819Z";
const expectedHostedReadOnlyProofAt = "2026-06-15T11:52:56.617Z";
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

const matrix = readJson(matrixPath);
if (matrix) {
  if (matrix.schema !== "tjc-stock-media-beta-open-blockers.v1") failures.push(`${matrixPath} has wrong schema`);
  if (matrix.decision !== "NO-GO") failures.push(`${matrixPath} decision must be NO-GO`);
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
  if (matrix.latestHostedReadOnlyProofAt !== expectedHostedReadOnlyProofAt) {
    failures.push(`${matrixPath} latestHostedReadOnlyProofAt must match ${expectedHostedReadOnlyProofAt}`);
  }
  requireString(matrix.decisionReason, `${matrixPath} decisionReason`);

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
    if (!diskFollowUp) {
      failures.push(`${matrixPath} missing local operational follow-up safe-lane-disk-headroom`);
    } else {
      if (diskFollowUp.status !== "follow-up") failures.push(`${matrixPath} safe-lane-disk-headroom status must be follow-up`);
      if (diskFollowUp.owner !== "operator") failures.push(`${matrixPath} safe-lane-disk-headroom owner must be operator`);
      if (diskFollowUp.currentSignal !== "local free disk below 10 GiB") failures.push(`${matrixPath} safe-lane-disk-headroom currentSignal must be local free disk below 10 GiB`);
      if (!String(diskFollowUp.latestObserved || "").endsWith("GiB")) failures.push(`${matrixPath} safe-lane-disk-headroom latestObserved must be recorded in GiB`);
      if (diskFollowUp.evidenceDoc !== "docs/runs/evidence/2026-06-15/08-durable-state-proof.md") {
        failures.push(`${matrixPath} safe-lane-disk-headroom evidenceDoc must point at durable-state proof`);
      }
      for (const boundary of [
        "make safe-lane-disk-report",
        "never clean shared checkout",
        "source media",
        "prod/hosted surfaces",
        "evidence artifacts",
        "497M",
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
