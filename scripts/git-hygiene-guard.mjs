#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const root = process.env.GIT_HYGIENE_GUARD_ROOT || process.cwd();
const mediaPattern = /\.(jpg|jpeg|png|heic|heif|gif|tif|tiff|mp4|mov|m4v|mp3|wav|m4a|aac|flac)$/i;
const allowedMediaPatterns = [
  /^frontend\/public\/brand\/[^/]+\.png$/i,
  /^docs\/screenshots\/free-internal-beta-2026-06-12\/[^/]+\.png$/i,
];
const runtimePattern = /(^|\/)(\.env$|\.runtime|data\/runtime|filestore|mariadb|ComfyUI|models\/)/;

function gitLsFiles() {
  return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const tracked = gitLsFiles();
const mediaFiles = tracked.filter(
  (file) => mediaPattern.test(file) && !allowedMediaPatterns.some((pattern) => pattern.test(file)),
);
const runtimeFiles = tracked.filter((file) => runtimePattern.test(file));
const failures = [];

if (mediaFiles.length) {
  failures.push("church/media files tracked by Git:");
  failures.push(...mediaFiles.map((file) => `  ${file}`));
}

if (runtimeFiles.length) {
  failures.push("env/runtime/model files tracked by Git:");
  failures.push(...runtimeFiles.map((file) => `  ${file}`));
}

if (failures.length) {
  console.error("Git hygiene guard failed:");
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log("Git hygiene guard passed.");
