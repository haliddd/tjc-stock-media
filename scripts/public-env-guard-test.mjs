#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/public-env-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-public-env-guard-")));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

function copyFixture(targetRoot) {
  fs.cpSync(path.join(root, "frontend/components"), path.join(targetRoot, "frontend/components"), { recursive: true });
  fs.cpSync(path.join(root, "frontend/app"), path.join(targetRoot, "frontend/app"), { recursive: true });
  for (const envFile of [".env.production.example", ".env.example"]) {
    const source = path.join(root, envFile);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(targetRoot, envFile));
  }
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyFixture(targetRoot);
  return targetRoot;
}

function write(targetRoot, relativePath, source) {
  const target = path.join(targetRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: root,
    env: {
      ...process.env,
      PUBLIC_ENV_GUARD_ROOT: targetRoot
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

expectFail("public-secret-env-regression", (targetRoot) => {
  fs.appendFileSync(path.join(targetRoot, ".env.production.example"), "\nNEXT_PUBLIC_RS_API_KEY=change-me\n");
});

expectFail("unapproved-public-env-regression", (targetRoot) => {
  fs.appendFileSync(path.join(targetRoot, ".env.example"), "\nNEXT_PUBLIC_EXPERIMENTAL_FLAG=1\n");
});

expectFail("client-server-env-read-regression", (targetRoot) => {
  const file = "frontend/components/RoleProvider.tsx";
  write(targetRoot, file, `${read(targetRoot, file)}\nconst badNodeEnvRead = process.env.NODE_ENV;\n`);
});

expectFail("client-unapproved-public-read-regression", (targetRoot) => {
  const file = "frontend/components/RoleProvider.tsx";
  write(targetRoot, file, `${read(targetRoot, file)}\nconst badPublicRead = process.env.NEXT_PUBLIC_SECRET_TOKEN;\n`);
});

expectFail("app-client-server-env-read-regression", (targetRoot) => {
  write(targetRoot, "frontend/app/regression-client.tsx", '"use client";\nexport const bad = process.env.AWS_SECRET_ACCESS_KEY;\n');
});

if (failures.length) {
  console.error("Public env guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public env guard self-test passed.");
