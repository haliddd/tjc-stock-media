#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const guardPath = path.join(root, "scripts/open-blockers-guard.mjs");
const baseMatrix = JSON.parse(fs.readFileSync(path.join(root, "docs/runs/evidence/2026-06-15/open-blockers.json"), "utf8"));
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

function runGuard(filePath) {
  return spawnSync(process.execPath, [guardPath, filePath], {
    cwd: root,
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

expectPass("current-no-go-matrix", baseMatrix);

expectFail("false-go-decision", {
  ...baseMatrix,
  decision: "GO",
  blockers: baseMatrix.blockers.map((blocker) => ({ ...blocker, status: "resolved" }))
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

expectFail("stale-disk-cleanup-estimate", {
  ...baseMatrix,
  localOperationalFollowUps: baseMatrix.localOperationalFollowUps.map((item) => item.id === "safe-lane-disk-headroom"
    ? { ...item, safeNextStep: item.safeNextStep.replace("497M", "498M") }
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

expectFail("stale-browser-qa-proof", {
  ...baseMatrix,
  latestLocalBrowserQaProofAt: "2026-06-15T12:39:38.870Z"
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
