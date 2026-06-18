#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const smokePath = path.join(root, "scripts/portal-writeback-guard-smoke.sh");
const source = fs.readFileSync(smokePath, "utf8");
const failures = [];

const requiredSnippets = [
  {
    label: "safe shell mode",
    text: "set -euo pipefail"
  },
  {
    label: "trusted identity helper",
    text: "portal-smoke-trusted-identity.sh"
  },
  {
    label: "trusted curl wrapper",
    text: "portal_smoke_http_code"
  },
  {
    label: "local-only runtime fixture branch",
    text: 'if [ "$local_runtime_probe" = "1" ]; then'
  },
  {
    label: "writeback readiness non-live assertion",
    text: "writeback-readiness-not-live"
  },
  {
    label: "incomplete evidence blocked assertion",
    text: "writeback-incomplete-evidence-blocked"
  },
  {
    label: "complete evidence queues-only assertion",
    text: "writeback-complete-evidence-queues-only"
  },
  {
    label: "live ResourceSpace success rejection",
    text: "updated through the live API|resourcespace-live-writeback|synced_to_resourcespace"
  },
  {
    label: "pending queue visibility assertion",
    text: "writeback-pending-queue-visible"
  },
  {
    label: "pending count cap assertion",
    text: "pendingCount > 200)"
  },
  {
    label: "unsafe persisted readiness rejection",
    text: "unsafe persisted audit/pending fields leaked into readiness"
  },
  {
    label: "persisted audit sanitation assertion",
    text: "persisted audit lines sanitized"
  }
];

function checkSource(candidate) {
  const errors = [];
  for (const { label, text } of requiredSnippets) {
    if (!candidate.includes(text)) errors.push(`missing ${label}: ${text}`);
  }
  if (!/case "\$BASE_URL" in[\s\S]*http:\/\/localhost:\*\|http:\/\/127\.0\.0\.1:\*\)/.test(candidate)) {
    errors.push("missing localhost/127.0.0.1 local runtime probe restriction");
  }
  if (!/if \[ "\$local_runtime_probe" = "1" \]; then[\s\S]*\.runtime[\s\S]*fi/.test(candidate)) {
    errors.push("runtime seeding must stay inside local_runtime_probe branch");
  }
  if (/PORTAL_HOSTED_SMOKE_ALLOW_MUTATION|RESOURCESPACE_ENABLE_WRITEBACK=1|RESOURCESPACE_WRITEBACK_MODE=live/.test(candidate)) {
    errors.push("writeback guard smoke must not enable hosted mutation or live ResourceSpace writeback");
  }
  return errors;
}

function expectPass(label, candidate) {
  const errors = checkSource(candidate);
  if (errors.length) failures.push(`${label} should pass:\n${errors.map((error) => `- ${error}`).join("\n")}`);
}

function expectFail(label, candidate, expectedText) {
  const errors = checkSource(candidate);
  if (!errors.length) {
    failures.push(`${label} should fail but passed`);
    return;
  }
  if (expectedText && !errors.some((error) => error.includes(expectedText))) {
    failures.push(`${label} failure should mention ${expectedText}:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

expectPass("current-real-smoke", source);

expectFail(
  "missing-trusted-helper",
  source.replace('source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"', "# helper removed"),
  "trusted identity helper"
);

expectFail(
  "missing-local-runtime-branch",
  source.replace(/if \[ "\$local_runtime_probe" = "1" \]; then/g, "if true; then"),
  "local-only runtime fixture branch"
);

expectFail(
  "missing-live-success-rejection",
  source.replace(/updated through the live API\|resourcespace-live-writeback\|synced_to_resourcespace/g, "queued_only"),
  "live ResourceSpace success rejection"
);

expectFail(
  "missing-pending-cap",
  source.replace("pendingCount > 200)", "pendingCount > 200000)"),
  "pending count cap assertion"
);

expectFail(
  "missing-persisted-audit-check",
  source.replace("persisted audit lines sanitized", "audit lines present"),
  "persisted audit sanitation assertion"
);

expectFail(
  "accidental-live-writeback-env",
  `${source}\nRESOURCESPACE_WRITEBACK_MODE=live\n`,
  "live ResourceSpace writeback"
);

if (failures.length) {
  console.error("Portal writeback guard smoke self-test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Portal writeback guard smoke self-test passed.");
