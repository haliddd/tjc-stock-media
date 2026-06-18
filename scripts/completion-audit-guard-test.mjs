#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const guardPath = path.join(root, "scripts/completion-audit-guard.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-completion-audit-guard-"));
const failures = [];
process.on("exit", () => fs.rmSync(tempRoot, { recursive: true, force: true }));

const fixtureFiles = [
  "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md",
  "docs/runs/evidence/2026-06-15/open-blockers.json"
];

function copyFixtures(targetRoot) {
  for (const relativePath of fixtureFiles) {
    const source = path.join(root, relativePath);
    const target = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function fixturePath(label) {
  const targetRoot = path.join(tempRoot, label);
  fs.mkdirSync(targetRoot, { recursive: true });
  copyFixtures(targetRoot);
  return targetRoot;
}

function read(targetRoot, relativePath) {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}

function write(targetRoot, relativePath, source) {
  fs.writeFileSync(path.join(targetRoot, relativePath), source);
}

function runGuard(targetRoot) {
  return spawnSync(process.execPath, [guardPath], {
    cwd: targetRoot,
    encoding: "utf8"
  });
}

function expectPass(label, mutate) {
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

function expectFailOutputWithTarget(label, makeTarget, mutate, expectedText) {
  const targetRoot = makeTarget(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.status === 0) {
    failures.push(`${label} should fail but passed:\n${result.stdout}`);
    return;
  }
  if (!output.includes(expectedText)) {
    failures.push(`${label} failure should mention ${expectedText}:\n${output}`);
  }
}

function runGit(targetRoot, args) {
  execFileSync("git", args, {
    cwd: targetRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function makeGitBackedFixture(label) {
  const targetRoot = fixturePath(label);
  const extraPath = path.join(targetRoot, "docs/unlisted-proof-artifact.txt");
  fs.mkdirSync(path.dirname(extraPath), { recursive: true });
  fs.writeFileSync(extraPath, "baseline\n");
  runGit(targetRoot, ["init"]);
  runGit(targetRoot, ["add", "."]);
  runGit(targetRoot, [
    "-c",
    "user.email=proof-lane@example.invalid",
    "-c",
    "user.name=Proof Lane",
    "commit",
    "-m",
    "fixture baseline"
  ]);
  return targetRoot;
}

function expectFailWithGitBackedFixture(label, mutate) {
  const targetRoot = makeGitBackedFixture(label);
  mutate(targetRoot);
  const result = runGuard(targetRoot);
  if (result.status === 0) failures.push(`${label} should fail but passed:\n${result.stdout}`);
}

function mutateLedger(targetRoot, mutate) {
  const file = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
  write(targetRoot, file, mutate(read(targetRoot, file)));
}

function mutateBlockers(targetRoot, mutate) {
  const file = "docs/runs/evidence/2026-06-15/open-blockers.json";
  const matrix = JSON.parse(read(targetRoot, file));
  write(targetRoot, file, `${JSON.stringify(mutate(matrix), null, 2)}\n`);
}

function ledgerInventory(source) {
  const match = source.match(/## Changed Files Inventory[\s\S]*?```text\n([\s\S]*?)\n```/);
  if (!match) throw new Error("ledger fixture missing changed files inventory");
  return match[1].split("\n").map((line) => line.trim()).filter(Boolean);
}

function makeInventoryOrderFixture(label) {
  const targetRoot = fixturePath(label);
  const ledgerPath = "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md";
  const inventory = ledgerInventory(read(targetRoot, ledgerPath));

  for (const relativePath of inventory) {
    const fullPath = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, "baseline\n");
  }

  runGit(targetRoot, ["init"]);
  runGit(targetRoot, ["add", "."]);
  runGit(targetRoot, [
    "-c",
    "user.email=proof-lane@example.invalid",
    "-c",
    "user.name=Proof Lane",
    "commit",
    "-m",
    "fixture baseline"
  ]);

  for (const relativePath of inventory) {
    if (relativePath === ledgerPath) continue;
    const fullPath = path.join(targetRoot, relativePath);
    const current = fs.readFileSync(fullPath, "utf8");
    fs.writeFileSync(fullPath, `${current}\nchanged for inventory-order fixture\n`);
  }

  return targetRoot;
}

expectPass("current-completion-audit");

expectFail("false-complete-decision", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "Audit decision: do not mark the overall goal complete.",
    "Audit decision: complete."
  ));
});

expectFail("false-beta-ready-verdict", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "Final verdict: **Not beta ready**.",
    "Final verdict: **Beta ready with limitations**."
  ));
});

expectFail("missing-completion-audit-section", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace("## Completion Audit", "## Completion Summary"));
});

expectFail("missing-final-report-checklist", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace("## Final Report Checklist", "## Final Report Summary"));
});

expectFail("missing-changed-files-inventory", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace("## Changed Files Inventory", "## Changed Files Summary"));
});

expectFailWithGitBackedFixture("changed-files-inventory-drift", (targetRoot) => {
  write(targetRoot, "docs/unlisted-proof-artifact.txt", "changed outside ledger inventory\n");
});

expectFailWithGitBackedFixture("untracked-changed-files-inventory-drift", (targetRoot) => {
  write(targetRoot, "docs/untracked-proof-artifact.txt", "untracked outside ledger inventory\n");
});

expectFailOutputWithTarget("changed-files-inventory-order-drift", makeInventoryOrderFixture, (targetRoot) => {
  const source = read(targetRoot, "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md");
  const inventory = ledgerInventory(source);
  if (inventory.length < 2) throw new Error("not enough inventory rows for order drift fixture");
  const swapped = [...inventory];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  write(
    targetRoot,
    "docs/runs/evidence/2026-06-15/12-safe-30-40h-ui-run.md",
    source.replace(
      /## Changed Files Inventory[\s\S]*?```text\n[\s\S]*?\n```/,
      `## Changed Files Inventory\n\nCaptured with \`(git diff --name-only && git diff --cached --name-only && git ls-files --others --exclude-standard) | sort -u\` from the isolated worktree. This is the current proof-lane file inventory; it does not include main checkout sibling-lane changes.\n\n\`\`\`text\n${swapped.join("\n")}\n\`\`\``
    )
  );
}, "inventory order differs");

expectFail("missing-command-ledger-row", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS |",
    "| `BASE_URL=http://localhost:4871 make portal-api-smoke` | NOT RUN |"
  ));
});

expectFail("missing-final-report-browser-qa-report-path", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replaceAll(
    "docs/screenshots/qa/browser-qa-report.json",
    "docs/screenshots/qa/stale-report.json"
  ));
});

expectFail("stale-final-report-browser-qa-screenshot-path", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "screenshot PNGs under `docs/screenshots/`",
    "screenshots under `docs/screenshots/qa/`"
  ));
});

expectFail("canonical-blocker-overclaimed", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "| Canonical repo/deploy/commit locked | `01-canonical-repo-deploy.md` | BLOCKED |",
    "| Canonical repo/deploy/commit locked | `01-canonical-repo-deploy.md` | PASS local |"
  ));
});

expectFail("missing-external-dependency-warning", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "full objective still depends on external hosted/canonical/ResourceSpace/Drive/durable/tester approval evidence",
    "full objective is done"
  ));
});

expectFail("missing-evidence-packet-self-test-proof", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replaceAll(
    "; `evidence-packet-guard-test`",
    ""
  ).replaceAll(
    "| `make evidence-packet-guard-test` | PASS |\n",
    ""
  ));
});

expectFail("missing-disk-headroom-follow-up", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("| Local disk headroom for long autonomous lane |"))
    .join("\n"));
});

expectFail("missing-disk-headroom-override-reason-boundary", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "any focused threshold override requires `SAFE_LANE_HEADROOM_OVERRIDE_REASON`; ",
    ""
  ));
});

expectFail("missing-disk-headroom-cleanup-insufficiency", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "safe isolated cleanup may not be enough for default headroom; ",
    ""
  ));
});

expectFail("main-checkout-touch-overclaimed", (targetRoot) => {
  mutateLedger(targetRoot, (source) => source.replace(
    "Main checkout files touched: no",
    "Main checkout files touched: yes"
  ));
});

expectFail("blocker-matrix-false-go", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    decision: "GO"
  }));
});

expectFail("hosted-access-overclaimed", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    blockers: matrix.blockers.map((blocker) => blocker.id === "hosted-access-protection"
      ? { ...blocker, status: "pass" }
      : blocker)
  }));
});

expectFail("missing-durable-blocker", (targetRoot) => {
  mutateBlockers(targetRoot, (matrix) => ({
    ...matrix,
    blockers: matrix.blockers.filter((blocker) => blocker.id !== "durable-hosted-state")
  }));
});

if (failures.length) {
  console.error("Completion audit guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Completion audit guard self-test passed.");
