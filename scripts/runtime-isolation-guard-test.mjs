#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/runtime-isolation-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-runtime-isolation-guard-")));
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

function artifactSnapshot(fullPath) {
  const size = run("du", ["-sh", fullPath]).split(/\s+/)[0];
  const mtime = run("stat", ["-f", "%Sm", "-t", "%Y-%m-%dT%H:%M:%S%z", fullPath]);
  return { size, mtime };
}

function mkdir(relativeOrFullPath) {
  fs.mkdirSync(relativeOrFullPath, { recursive: true });
}

function write(filePath, source) {
  mkdir(path.dirname(filePath));
  fs.writeFileSync(filePath, source);
}

function createArtifactTree(basePath) {
  for (const relativePath of [
    ".runtime",
    "frontend/.next",
    "docs/screenshots/qa",
    "docs/runs/evidence/2026-06-15",
    "docs/runs/evidence/2026-06-15/hosted-readonly-probes"
  ]) {
    mkdir(path.join(basePath, relativePath));
  }
  write(path.join(basePath, ".runtime/proof.json"), "{}\n");
  write(path.join(basePath, "frontend/.next/build-manifest.json"), "{}\n");
  write(path.join(basePath, "docs/screenshots/qa/browser-qa-report.json"), "{}\n");
  write(path.join(basePath, "docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json"), "{}\n");
}

function inventoryRows(paths) {
  return paths.map((fullPath) => {
    const { size, mtime } = artifactSnapshot(fullPath);
    return `| \`${fullPath}\` | ${size} | ${mtime} |`;
  });
}

function createFixture(label) {
  const fixtureRoot = path.join(tempRoot, label);
  const worktree = path.join(fixtureRoot, "worktree");
  const sourceCheckout = path.join(fixtureRoot, "source");
  mkdir(worktree);
  mkdir(sourceCheckout);
  run("git", ["init"], { cwd: worktree });
  createArtifactTree(worktree);
  createArtifactTree(sourceCheckout);

  const sourcePaths = [".runtime", "frontend/.next", "docs/screenshots/qa"].map((relativePath) => path.join(sourceCheckout, relativePath));
  const isolatedPaths = [".runtime", "frontend/.next", "docs/screenshots/qa"].map((relativePath) => path.join(worktree, relativePath));
  const sourceRows = inventoryRows(sourcePaths);
  const isolatedRows = inventoryRows(isolatedPaths);
  const ledgerPath = path.join(worktree, "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md");
  const dailyPath = path.join(worktree, "docs/runs/daily-checkpoint-2026-06-15.md");

  write(ledgerPath, [
    "# Safe Lane",
    "Source checkout artifact inventory inspected read-only.",
    "Source checkout artifacts were not used as proof and this session did not mutate them.",
    "",
    "| Artifact | Size | Modified |",
    "|---|---:|---|",
    ...sourceRows,
    ...isolatedRows,
    ""
  ].join("\n"));

  write(dailyPath, [
    "# Daily Checkpoint",
    "Source checkout artifact inventory inspected read-only.",
    "Source checkout artifacts were not used as proof and this session did not mutate them.",
    "",
    ...sourceRows,
    ""
  ].join("\n"));

  return { worktree, sourceCheckout, ledgerPath, dailyPath };
}

function guardEnv(fixture) {
  return {
    ...process.env,
    RUNTIME_ISOLATION_EXPECTED_WORKTREE: fixture.worktree,
    RUNTIME_ISOLATION_EXPECTED_SOURCE_CHECKOUT: fixture.sourceCheckout,
    RUNTIME_ISOLATION_LEDGER_PATH: "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md",
    RUNTIME_ISOLATION_DAILY_PATH: "docs/runs/daily-checkpoint-2026-06-15.md"
  };
}

function runGuard(fixture) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: fixture.worktree,
    env: guardEnv(fixture),
    encoding: "utf8"
  });
}

function runGuardWithEnv(fixture, envOverrides) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: fixture.worktree,
    env: { ...guardEnv(fixture), ...envOverrides },
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  const fixture = createFixture(label);
  if (mutate) mutate(fixture);
  const result = runGuard(fixture);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate) {
  const fixture = createFixture(label);
  mutate(fixture);
  const result = runGuard(fixture);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

function expectFailWithEnv(label, envOverrides) {
  const fixture = createFixture(label);
  const result = runGuardWithEnv(fixture, envOverrides);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("fixture-valid");

expectPass("source-checkout-drift-tolerated", (fixture) => {
  write(path.join(fixture.sourceCheckout, "frontend/.next/sibling-session-drift.bin"), "source checkout changed outside this safe lane\n");
});

expectFail("source-checkout-same-realpath", (fixture) => {
  fixture.sourceCheckout = fixture.worktree;
});

expectFailWithEnv("ledger-path-parent-escape", {
  RUNTIME_ISOLATION_LEDGER_PATH: "../source/docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md"
});

expectFailWithEnv("daily-path-absolute-escape", {
  RUNTIME_ISOLATION_DAILY_PATH: path.join(tempRoot, "outside-daily.md")
});

expectFail("screenshot-proof-symlink-escapes-worktree", (fixture) => {
  const target = path.join(fixture.worktree, "docs/screenshots/qa");
  fs.rmSync(target, { recursive: true, force: true });
  fs.symlinkSync(path.join(fixture.sourceCheckout, "docs/screenshots/qa"), target, "dir");
});

expectFail("stale-isolated-next-inventory", (fixture) => {
  const nextPath = path.join(fixture.worktree, "frontend/.next");
  const { size, mtime } = artifactSnapshot(nextPath);
  const source = fs.readFileSync(fixture.ledgerPath, "utf8");
  fs.writeFileSync(fixture.ledgerPath, source.replace(
    `| \`${nextPath}\` | ${size} | ${mtime} |`,
    `| \`${nextPath}\` | stale | 2000-01-01T00:00:00-0000 |`
  ));
});

expectPass("missing-isolated-runtime-before-rerun", (fixture) => {
  fs.rmSync(path.join(fixture.worktree, ".runtime"), { recursive: true, force: true });
});

expectFail("daily-missing-readonly-proof", (fixture) => {
  fs.writeFileSync(fixture.dailyPath, "# Daily Checkpoint\n");
});

expectFail("missing-source-ledger-path", (fixture) => {
  const sourcePath = path.join(fixture.sourceCheckout, "frontend/.next");
  const source = fs.readFileSync(fixture.ledgerPath, "utf8");
  fs.writeFileSync(fixture.ledgerPath, source.replace(new RegExp(`\\| \`${sourcePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\` \\|[^\\n]+\\n`), ""));
});

expectFail("tracked-runtime-artifact", (fixture) => {
  write(path.join(fixture.worktree, ".runtime/tracked.json"), "{}\n");
  run("git", ["add", ".runtime/tracked.json"], { cwd: fixture.worktree });
});

if (failures.length) {
  console.error("Runtime isolation guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Runtime isolation guard self-test passed.");
