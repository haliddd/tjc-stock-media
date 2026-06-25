#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.env.GIT_HYGIENE_GUARD_ROOT || process.cwd();
const mediaPattern = /\.(jpg|jpeg|png|webp|heic|heif|gif|tif|tiff|arw|mp4|mov|m4v|mp3|wav|m4a|aac|flac|zip)$/i;
const primitiveProofDir = "docs/screenshots/primitive-proof/";
const expectedPrimitiveProofScreenshots = [
  "admin-datatable.png",
  "appnav-tubelight-desktop.png",
  "appnav-tubelight-mobile.png",
  "library-badges-pagination-filterpills.png",
  "media-preview-panel-document.png",
  "media-preview-panel-image.png",
  "review-datatable-inspector.png",
  "review-hold-confirm-dialog.png",
  "state-system-empty-error-loading.png",
  "toast-feedback.png",
  "upload-dropzone-tags.png"
].map((file) => `${primitiveProofDir}${file}`);
const expectedPrimitiveProofSet = new Set(expectedPrimitiveProofScreenshots);
const allowedMediaPatterns = [
  /^frontend\/public\/brand\/[^/]+\.png$/i,
  /^docs\/screenshots\/free-internal-beta-2026-06-12\/[^/]+\.png$/i,
  /^docs\/screenshots\/prototype-final-blocker-pass-2026-06-22\/[^/]+\.png$/i,
  /^docs\/screenshots\/qa\/issue-\d+[-\w]*\.png$/i,
  /^docs\/screenshots\/qa\/product-wide-parity-\d{4}-\d{2}-\d{2}\/[^/]+\.png$/i,
  /^docs\/runs\/evidence\/2026-06-18\/final-premerge-ui-review\/[^/]+\.png$/i,
];
const modelArtifactPattern = /\.(safetensors|ckpt|pt|pth|onnx)$/i;
const credentialArtifactPattern = /(^|\/)(credentials|secrets)\/|(^|\/)(service-account|google-credentials|credentials|secret)[^/]*\.(json|env|pem|key|p12|pfx)$|\.(pem|key|p12|pfx)$/i;
const runtimePattern = /(^|\/)(\.runtime|\.next|data\/runtime|filestore|mariadb|ComfyUI|models\/)/;
const osMetadataPattern = /(^|\/)(\.DS_Store|Thumbs\.db)$/;
const requiredTrackedProofHarness = [
  "scripts/portal-browser-qa-with-server.mjs",
  "scripts/portal-browser-qa-with-server-test.mjs"
];

function gitLsFiles() {
  return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAllowedMedia(file) {
  return expectedPrimitiveProofSet.has(file) || allowedMediaPatterns.some((pattern) => pattern.test(file));
}

function isTrackedEnvFile(file) {
  const base = path.basename(file);
  return base === ".env" || (base.startsWith(".env.") && !base.endsWith(".example"));
}

const tracked = gitLsFiles();
const trackedSet = new Set(tracked);
const mediaFiles = tracked.filter((file) => mediaPattern.test(file) && !isAllowedMedia(file));
const runtimeFiles = tracked.filter((file) => runtimePattern.test(file) || modelArtifactPattern.test(file) || isTrackedEnvFile(file));
const credentialFiles = tracked.filter((file) => credentialArtifactPattern.test(file));
const osMetadataFiles = tracked.filter((file) => osMetadataPattern.test(file));
const failures = [];

const isTjcProofRepo = fs.existsSync(path.join(root, "Makefile"))
  && fs.existsSync(path.join(root, "scripts", "launch-readiness.sh"));

if (mediaFiles.length) {
  failures.push("church/media files tracked by Git:");
  failures.push(...mediaFiles.map((file) => `  ${file}`));
}

if (runtimeFiles.length) {
  failures.push("env/runtime/model files tracked by Git:");
  failures.push(...runtimeFiles.map((file) => `  ${file}`));
}

if (credentialFiles.length) {
  failures.push("credential/key files tracked by Git:");
  failures.push(...credentialFiles.map((file) => `  ${file}`));
}

if (osMetadataFiles.length) {
  failures.push("OS metadata/junk files tracked by Git:");
  failures.push(...osMetadataFiles.map((file) => `  ${file}`));
}

if (isTjcProofRepo) {
  const missingTrackedProofHarness = requiredTrackedProofHarness.filter((file) => !trackedSet.has(file));
  if (missingTrackedProofHarness.length) {
    failures.push("required proof harness files must be tracked by Git:");
    failures.push(...missingTrackedProofHarness.map((file) => `  ${file}`));
  }

  const trackedPrimitiveProofScreenshots = tracked.filter(
    (file) => file.startsWith(primitiveProofDir) && /\.png$/i.test(file),
  );
  const missingPrimitiveProofScreenshots = expectedPrimitiveProofScreenshots.filter((file) => !trackedSet.has(file));
  const unexpectedPrimitiveProofScreenshots = trackedPrimitiveProofScreenshots.filter(
    (file) => !expectedPrimitiveProofSet.has(file),
  );

  if (missingPrimitiveProofScreenshots.length) {
    failures.push("required primitive proof screenshots must be tracked by Git:");
    failures.push(...missingPrimitiveProofScreenshots.map((file) => `  ${file}`));
  }

  if (unexpectedPrimitiveProofScreenshots.length) {
    failures.push("unexpected primitive proof screenshots tracked by Git:");
    failures.push(...unexpectedPrimitiveProofScreenshots.map((file) => `  ${file}`));
  }
}

if (failures.length) {
  console.error("Git hygiene guard failed:");
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log("Git hygiene guard passed.");
