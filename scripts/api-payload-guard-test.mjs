#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/api-payload-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-api-payload-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyFixture(targetRoot) {
  fs.cpSync(path.join(root, "frontend/app/api"), path.join(targetRoot, "frontend/app/api"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/lib"), path.join(targetRoot, "frontend/lib"), { recursive: true });
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
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
      API_PAYLOAD_GUARD_ROOT: targetRoot
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

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("private-url-payload-key-regression", (targetRoot) => {
  const file = "frontend/app/api/assets/search/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst leak = { signedUrl: \"https://private.example.test/original.jpg\" };\n`);
});

expectFail("source-redaction-download-field-regression", (targetRoot) => {
  const file = "frontend/lib/source-redaction.ts";
  write(targetRoot, file, read(targetRoot, file).replace("download: _download", "download"));
});

expectFail("download-route-sprawl-regression", (targetRoot) => {
  const file = "frontend/app/api/download/[id]/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst scatteredGate = appendAuditEvent;\n`);
});

expectFail("thumbnail-handrolled-variant-regression", (targetRoot) => {
  const file = "frontend/app/api/assets/thumbnail/[id]/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst variantParam = \"download\";\n`);
});

expectFail("raw-json-parse-regression", (targetRoot) => {
  const file = "frontend/app/api/beta-feedback/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst body = await request.json().catch(() => ({}));\n`);
});

expectFail("collection-route-normalization-regression", (targetRoot) => {
  const file = "frontend/app/api/collections/route.ts";
  write(targetRoot, file, `${read(targetRoot, file)}\n// regression fixture\nconst selected = selectedAssetIds;\n`);
});

if (failures.length) {
  console.error("API payload guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API payload guard self-test passed.");
