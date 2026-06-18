#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/storage-honesty-guard.mjs");
const gitHygieneGuardPath = path.join(root, "scripts/git-hygiene-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-storage-honesty-guard-")));
const failures = [];

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function copyFixture(targetRoot) {
  fs.mkdirSync(path.join(targetRoot, "frontend"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/lib"), path.join(targetRoot, "frontend/lib"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/app"), path.join(targetRoot, "frontend/app"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/components"), path.join(targetRoot, "frontend/components"), { recursive: true });
  fs.copyFileSync(path.join(root, "frontend/next.config.mjs"), path.join(targetRoot, "frontend/next.config.mjs"));
  fs.cpSync(path.join(root, "scripts"), path.join(targetRoot, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(root, "Makefile"), path.join(targetRoot, "Makefile"));
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  copyFixture(targetRoot);
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      STORAGE_HONESTY_GUARD_ROOT: targetRoot
    },
    encoding: "utf8"
  });
}

function runGit(args, cwd) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function expectPass(label, mutate) {
  if (label === "current-real-lane") {
    const result = spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
    return;
  }
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

function expectGitHygieneFail(label, mutate) {
  const targetRoot = fixturePath(label);
  runGit(["init", "-q"], targetRoot);
  runGit(["config", "user.email", "storage-honesty-guard-test@example.test"], targetRoot);
  runGit(["config", "user.name", "Storage Honesty Guard Test"], targetRoot);
  mutate(targetRoot);
  const result = spawnSync(process.execPath, [gitHygieneGuardPath], {
    cwd: targetRoot,
    encoding: "utf8"
  });
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("unbounded-local-feedback-store", (targetRoot) => {
  const file = "frontend/lib/beta-feedback.ts";
  write(targetRoot, file, read(targetRoot, file).replace("maxBetaFeedbackRecords = 500", "maxBetaFeedbackItems = 500"));
});

expectFail("hosted-beta-local-json-durable-overclaim", (targetRoot) => {
  const file = "frontend/lib/saved-search-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace("durableStorageConfigured: false", "durableStorageConfigured: true"));
});

expectFail("local-json-memory-fallback-missing", (targetRoot) => {
  const file = "frontend/lib/local-json-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace(/memoryStore/g, "memoryCacheRegression"));
});

expectFail("feedback-write-silently-succeeds-without-durable-store", (targetRoot) => {
  const file = "frontend/lib/local-json-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace("assertRuntimeWriteAllowed(categoryForPath(options.filePath()));", ""));
});

expectFail("audit-write-silently-succeeds-without-durable-store", (targetRoot) => {
  const file = "frontend/lib/runtime-file-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace("assertRuntimeWriteAllowed(categoryForPath(filePath));", ""));
});

expectFail("download-ticket-write-silently-succeeds-without-durable-store", (targetRoot) => {
  const file = "frontend/lib/download-tickets.ts";
  write(targetRoot, file, read(targetRoot, file).replace("writeRuntimeJsonFile(ticketPath(id), record);", "fs.writeFileSync(ticketPath(id), JSON.stringify(record));"));
});

expectFail("audit-log-handrolled-fs", (targetRoot) => {
  const file = "frontend/lib/audit-log.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\nimport fs from "node:fs";\n`);
});

expectFail("unbounded-local-runtime-file-diagnostics", (targetRoot) => {
  const file = "frontend/lib/runtime-file-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace(/maxFilesFromEnd/g, "maxFilesFromStart").replace(/maxLinesFromEnd/g, "maxLinesFromStart"));
});

expectGitHygieneFail("tracked-runtime-artifact", (targetRoot) => {
  write(targetRoot, ".runtime/tracked.json", "{}\n");
  runGit(["add", ".runtime/tracked.json"], targetRoot);
});

expectFail("missing-fail-closed-runtime-diagnostics", (targetRoot) => {
  const file = "frontend/lib/runtime-file-store.ts";
  write(targetRoot, file, read(targetRoot, file).replace("statefulWritesAllowed: !production || durable", "statefulWritesAllowed: true"));
});

expectFail("missing-feedback-fail-closed-route-diagnostics", (targetRoot) => {
  const file = "frontend/app/api/beta-feedback/[id]/route.ts";
  write(targetRoot, file, read(targetRoot, file).replace("betaFeedbackDurableStorageRouteError(error)", "betaFeedbackDurableStorageRouteError(new Error(\"ignored\"))"));
});

expectFail("missing-download-ticket-fail-closed-diagnostics", (targetRoot) => {
  const file = "frontend/lib/approved-delivery-gate.ts";
  write(targetRoot, file, read(targetRoot, file).replace("retry-after-ticket-store-recovers", "try-again-later"));
});

expectFail("persisted-date-parse-regression", (targetRoot) => {
  const file = "frontend/lib/package-store.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\nconst badTimestamp = Date.parse(\"2026-06-15\");\n`);
});

expectFail("resource-space-private-text-regression", (targetRoot) => {
  const file = "frontend/lib/request-validation.ts";
  write(targetRoot, file, read(targetRoot, file).replace("containsPrivateSourceText(ref)", "false"));
});

expectFail("upload-source-link-audit-leak", (targetRoot) => {
  const file = "frontend/lib/upload-intake.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\nconst badUploadAudit = { sourceLink: intake.sourceLink };\n`);
});

if (failures.length) {
  console.error("Storage honesty guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  cleanup();
  process.exit(1);
}

cleanup();
console.log("Storage honesty guard self-test passed.");
