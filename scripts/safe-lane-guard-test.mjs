#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/safe-lane-guard.mjs");
const tempRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tjc-safe-lane-guard-")));
const safeBranch = "codex/safe-ui-beta-proof-2026-06-15";
const baseUrl = "http://localhost:4871";
const ledgerRelativePath = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
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

function makeLedger({ sourceCheckout, worktree, branch, head, actualBaseUrl = baseUrl }) {
  return [
    "# Safe Lane",
    "",
    `Source checkout: \`${sourceCheckout}\``,
    `Isolated worktree path: \`${worktree}\``,
    `Branch: \`${branch}\``,
    `Current HEAD commit: \`${head}\``,
    `Actual BASE_URL: \`${actualBaseUrl}\``,
    "Secrets redacted: yes",
    "Runtime/build artifacts isolated under isolated worktree: yes",
    "Shared checkout untouched by this build/dev/smoke lane: yes",
    "Sibling sessions: 019ec981-e816-70d0-bac1-759bb7792a12, 019ec84d-5d83-7010-9393-f7df3739e4d9",
    "",
    "Forbidden surfaces not touched:",
    "- Vercel prod env",
    "- ResourceSpace prod data",
    "- Google Drive originals",
    "- DNS",
    "- Billing",
    "- Live writeback",
    "- Tester invites",
    "- Public launch",
    "- Source media",
    ""
  ].join("\n");
}

function createFixture(label) {
  const fixtureRoot = path.join(tempRoot, label);
  const sourceCheckout = path.join(fixtureRoot, "source");
  const worktree = path.join(fixtureRoot, "safe-worktree");
  fs.mkdirSync(sourceCheckout, { recursive: true });
  run("git", ["init"], { cwd: sourceCheckout });
  write(path.join(sourceCheckout, "README.md"), "fixture\n");
  run("git", ["add", "README.md"], { cwd: sourceCheckout });
  run("git", ["-c", "user.name=Codex", "-c", "user.email=codex@example.test", "commit", "-m", "fixture"], { cwd: sourceCheckout });
  run("git", ["worktree", "add", "-b", safeBranch, worktree, "HEAD"], { cwd: sourceCheckout });
  const head = run("git", ["rev-parse", "HEAD"], { cwd: worktree });
  write(path.join(worktree, ledgerRelativePath), makeLedger({
    sourceCheckout,
    worktree,
    branch: safeBranch,
    head
  }));
  return { sourceCheckout, worktree, head };
}

function guardEnv(fixture) {
  return {
    ...process.env,
    SAFE_LANE_EXPECTED_WORKTREE: fixture.worktree,
    SAFE_LANE_EXPECTED_SOURCE_CHECKOUT: fixture.sourceCheckout,
    SAFE_LANE_EXPECTED_BRANCH: safeBranch,
    SAFE_LANE_EXPECTED_BASE_URL: baseUrl,
    SAFE_LANE_LEDGER_PATH: ledgerRelativePath
  };
}

function runGuard(cwd, fixture) {
  return spawnSync(process.execPath, [guardPath], {
    cwd,
    env: fixture ? guardEnv(fixture) : process.env,
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
  if (label === "current-real-lane") {
    const result = runGuard(root);
    if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
    return;
  }
  const fixture = createFixture(label);
  if (mutate) mutate(fixture);
  const result = runGuard(fixture.worktree, fixture);
  if (result.status !== 0) failures.push(`${label} should pass:\n${result.stderr || result.stdout}`);
}

function expectFail(label, mutate, cwdSelector = (fixture) => fixture.worktree) {
  const fixture = createFixture(label);
  mutate(fixture);
  const result = runGuard(cwdSelector(fixture), fixture);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectFail("wrong-cwd-source-checkout", () => {}, (fixture) => fixture.sourceCheckout);

expectFail("missing-sibling-session", (fixture) => {
  const ledgerPath = path.join(fixture.worktree, ledgerRelativePath);
  fs.writeFileSync(ledgerPath, fs.readFileSync(ledgerPath, "utf8").replace(
    "019ec84d-5d83-7010-9393-f7df3739e4d9",
    "missing-session"
  ));
});

expectFail("wrong-base-url", (fixture) => {
  const ledgerPath = path.join(fixture.worktree, ledgerRelativePath);
  fs.writeFileSync(ledgerPath, fs.readFileSync(ledgerPath, "utf8").replace(
    `Actual BASE_URL: \`${baseUrl}\``,
    "Actual BASE_URL: `http://localhost:3000`"
  ));
});

expectFail("tracked-env-artifact", (fixture) => {
  write(path.join(fixture.worktree, ".env"), "SECRET=do-not-track\n");
  run("git", ["add", ".env"], { cwd: fixture.worktree });
});

expectFail("tracked-source-media", (fixture) => {
  write(path.join(fixture.worktree, "media/source.mov"), "not real media\n");
  run("git", ["add", "media/source.mov"], { cwd: fixture.worktree });
});

if (failures.length) {
  console.error("Safe lane guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Safe lane guard self-test passed.");
