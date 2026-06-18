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

const primitiveProofScreenshots = [
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
];

function trackPrimitiveProofScreenshots(repo) {
  for (const file of primitiveProofScreenshots) {
    track(repo, `docs/screenshots/primitive-proof/${file}`, "png\n");
  }
}

expectPass("current-real-lane");
expectPass("fixture-valid");

expectPass("required-proof-harness-tracked", (repo) => {
  track(repo, "Makefile", "launch-readiness:\n\t./scripts/launch-readiness.sh\n");
  track(repo, "scripts/launch-readiness.sh", "#!/usr/bin/env bash\n");
  track(repo, "scripts/portal-browser-qa-with-server.mjs", "console.log('server wrapper');\n");
  track(repo, "scripts/portal-browser-qa-with-server-test.mjs", "console.log('server wrapper test');\n");
  trackPrimitiveProofScreenshots(repo);
});

expectPass("allowed-brand-png", (repo) => {
  track(repo, "frontend/public/brand/logo.png", "png\n");
});

expectPass("allowed-screenshot-png", (repo) => {
  track(repo, "docs/screenshots/free-internal-beta-2026-06-12/library.png", "png\n");
});

expectPass("allowed-env-example", (repo) => {
  track(repo, ".env.example", "PORTAL_SAMPLE_ONLY=true\n");
  track(repo, ".env.production.example", "PORTAL_SAMPLE_ONLY=true\n");
});

expectPass("allowed-primitive-proof-screenshot-png", (repo) => {
  track(repo, "docs/screenshots/primitive-proof/review-hold-confirm-dialog.png", "png\n");
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

expectFail("tracked-env-local-file", (repo) => {
  track(repo, ".env.local", "SECRET=do-not-track\n");
});

expectFail("tracked-runtime-json", (repo) => {
  track(repo, ".runtime/audit-log/events.jsonl", "{}\n");
});

expectFail("tracked-next-build-artifact", (repo) => {
  track(repo, "frontend/.next/server/app-paths-manifest.json", "{}\n");
});

expectFail("tracked-data-runtime-artifact", (repo) => {
  track(repo, "data/runtime/download-tickets.jsonl", "{}\n");
});

expectFail("tracked-filestore-artifact", (repo) => {
  track(repo, "filestore/1/2/source.bin", "fixture\n");
});

expectFail("tracked-mariadb-artifact", (repo) => {
  track(repo, "mariadb/ibdata1", "fixture\n");
});

expectFail("tracked-comfyui-artifact", (repo) => {
  track(repo, "ComfyUI/output/render.png", "fixture\n");
});

expectFail("tracked-model-artifact", (repo) => {
  track(repo, "models/model.bin", "fixture\n");
});

expectFail("tracked-ds-store", (repo) => {
  track(repo, "docs/screenshots/.DS_Store", "mac metadata\n");
});

expectFail("tracked-windows-thumbnail-cache", (repo) => {
  track(repo, "docs/screenshots/Thumbs.db", "windows metadata\n");
});

expectFail("unexpected-primitive-proof-screenshot", (repo) => {
  track(repo, "Makefile", "launch-readiness:\n\t./scripts/launch-readiness.sh\n");
  track(repo, "scripts/launch-readiness.sh", "#!/usr/bin/env bash\n");
  track(repo, "scripts/portal-browser-qa-with-server.mjs", "console.log('server wrapper');\n");
  track(repo, "scripts/portal-browser-qa-with-server-test.mjs", "console.log('server wrapper test');\n");
  trackPrimitiveProofScreenshots(repo);
  track(repo, "docs/screenshots/primitive-proof/extra-dashboard.png", "png\n");
});

expectFail("missing-required-proof-harness", (repo) => {
  track(repo, "Makefile", "launch-readiness:\n\t./scripts/launch-readiness.sh\n");
  track(repo, "scripts/launch-readiness.sh", "#!/usr/bin/env bash\n");
});

expectFail("missing-required-proof-harness-test", (repo) => {
  track(repo, "Makefile", "launch-readiness:\n\t./scripts/launch-readiness.sh\n");
  track(repo, "scripts/launch-readiness.sh", "#!/usr/bin/env bash\n");
  track(repo, "scripts/portal-browser-qa-with-server.mjs", "console.log('server wrapper');\n");
  trackPrimitiveProofScreenshots(repo);
});

expectFail("missing-required-proof-harness-runner", (repo) => {
  track(repo, "Makefile", "launch-readiness:\n\t./scripts/launch-readiness.sh\n");
  track(repo, "scripts/launch-readiness.sh", "#!/usr/bin/env bash\n");
  track(repo, "scripts/portal-browser-qa-with-server-test.mjs", "console.log('server wrapper test');\n");
  trackPrimitiveProofScreenshots(repo);
});

if (failures.length) {
  console.error("Git hygiene guard self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Git hygiene guard self-test passed.");
