#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/git-hygiene-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-git-hygiene-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: options.env || process.env,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function write(filePath, source) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source);
}

function createRepo(label) {
  const repo = path.join(tempRoot, label);
  fs.mkdirSync(repo, { recursive: true });
  run("git", ["init"], { cwd: repo });
  write(path.join(repo, "README.md"), "fixture\n");
  run("git", ["add", "README.md"], { cwd: repo });
  run("git", ["-c", "user.name=Codex", "-c", "user.email=codex@example.test", "commit", "-m", "fixture"], { cwd: repo });
  return repo;
}

function runGuard(repo) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      GIT_HYGIENE_GUARD_ROOT: repo
    },
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
    return;
  }
  const repo = createRepo(label);
  if (mutate) mutate(repo);
  const result = runGuard(repo);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const repo = createRepo(label);
  mutate(repo);
  const result = runGuard(repo);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

function track(repo, relativePath, source = "fixture\n") {
  write(path.join(repo, relativePath), source);
  run("git", ["add", relativePath], { cwd: repo });
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectPass("allowed-brand-png", (repo) => {
  track(repo, "frontend/public/brand/logo.png", "png\n");
});

expectPass("allowed-screenshot-png", (repo) => {
  track(repo, "docs/screenshots/free-internal-beta-2026-06-12/library.png", "png\n");
});

expectFail("tracked-source-photo", (repo) => {
  track(repo, "source-media/photo.jpg", "not real media\n");
});

expectFail("tracked-source-video", (repo) => {
  track(repo, "source-media/video.mov", "not real media\n");
});

expectFail("tracked-env-file", (repo) => {
  track(repo, ".env", "SECRET=do-not-track\n");
});

expectFail("tracked-runtime-json", (repo) => {
  track(repo, ".runtime/audit-log/events.jsonl", "{}\n");
});

expectFail("tracked-model-artifact", (repo) => {
  track(repo, "models/model.bin", "fixture\n");
});

if (failures.length) {
  console.error("Git hygiene guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Git hygiene guard self-test passed.");
