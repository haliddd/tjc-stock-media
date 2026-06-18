import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "@/lib/env";
import type { AuditEventSummary, BetaReadinessFact, BetaReadinessResult, IntegrationReadinessItem } from "@/lib/types";

function fact(item: BetaReadinessFact): BetaReadinessFact {
  return item;
}

function integrationFact(integrations: IntegrationReadinessItem[], id: string, options?: { label?: string; warnWhenReady?: boolean }) {
  const item = integrations.find((candidate) => candidate.id === id);
  const ready = Boolean(item?.ready);
  return fact({
    id,
    label: options?.label || item?.label || id,
    ready,
    state: ready ? (options?.warnWhenReady ? "warn" : "pass") : item?.state === "Not configured" || item?.state === "Blocked" ? "block" : "warn",
    detail: item?.detail || "Readiness fact not reported.",
    source: "integration"
  });
}

function safeRead(file: string) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function browserQaFact(): BetaReadinessFact {
  const file = path.join(repoRoot(), "docs", "screenshots", "qa", "browser-qa-report.json");
  try {
    const parsed = JSON.parse(safeRead(file)) as {
      checkedAt?: string;
      pages?: number;
      viewports?: number[];
      failures?: unknown[];
      warnings?: unknown[];
      consoleErrors?: unknown[];
      networkFailures?: unknown[];
    };
    const failures = [
      ...(Array.isArray(parsed.failures) ? parsed.failures : []),
      ...(Array.isArray(parsed.consoleErrors) ? parsed.consoleErrors : []),
      ...(Array.isArray(parsed.networkFailures) ? parsed.networkFailures : [])
    ];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    const clean = failures.length === 0;
    return fact({
      id: "browser-qa",
      label: "Viewer and Reviewer browser QA",
      ready: clean,
      state: clean ? (warnings.length ? "warn" : "pass") : "block",
      detail: clean
        ? `Last QA ${parsed.checkedAt || "unknown"} covered ${parsed.pages || 0} pages across ${(parsed.viewports || []).join(", ") || "unknown"} px. Warnings: ${warnings.length}.`
        : `Browser QA report has ${failures.length} failure signal${failures.length === 1 ? "" : "s"}.`,
      source: "qa-report"
    });
  } catch {
    return fact({
      id: "browser-qa",
      label: "Viewer and Reviewer browser QA",
      ready: false,
      state: "warn",
      detail: "No readable browser QA report found at docs/screenshots/qa/browser-qa-report.json.",
      source: "qa-report"
    });
  }
}

function privateUrlFact(): BetaReadinessFact {
  const url = process.env.PRIVATE_BETA_URL || process.env.NEXT_PUBLIC_PORTAL_URL || process.env.VERCEL_URL || "";
  const ready = Boolean(url && !/localhost|127\.0\.0\.1|example\.tjc\.org/i.test(url));
  return fact({
    id: "private-beta-url",
    label: "Hosted rehearsal URL",
    ready,
    state: ready ? "pass" : "warn",
    detail: ready
      ? "Hosted rehearsal URL is configured. Confirm invite-only access before sharing."
      : "No non-local rehearsal URL is configured. Use localhost for rehearsal only.",
    source: "environment"
  });
}

function envFact(): BetaReadinessFact {
  const file = path.join(repoRoot(), ".env");
  const contents = safeRead(file);
  if (!contents) {
    return fact({
      id: "env-file",
      label: "Runtime env file",
      ready: false,
      state: "warn",
      detail: ".env is missing. Local rehearsal may still work through defaults, but invite flow needs explicit runtime config.",
      source: "environment"
    });
  }
  const placeholder = /change-me|example\.tjc\.org/i.test(contents);
  return fact({
    id: "env-file",
    label: "Runtime env file",
    ready: !placeholder,
    state: placeholder ? "warn" : "pass",
    detail: placeholder ? ".env still contains placeholder values." : ".env exists and does not contain obvious placeholder values.",
    source: "environment"
  });
}

function allowlistFact(): BetaReadinessFact {
  const guard = safeRead(path.join(repoRoot(), "scripts", "git-hygiene-guard.mjs"));
  const ready = /allowedMediaPattern/.test(guard) && /frontend\\\/public\\\/brand\\\/\[\^\/\]\+\\\.png/.test(guard);
  return fact({
    id: "brand-asset-allowlist",
    label: "Brand PNG allowlist",
    ready,
    state: ready ? "pass" : "block",
    detail: ready
      ? "Local rehearsal checks allow tracked app brand assets while still blocking church media files."
      : "Git hygiene guard does not show the app-brand PNG media allowlist.",
    source: "git-hygiene"
  });
}

function betaRoleSwitchFact(): BetaReadinessFact {
  const tools = safeRead(path.join(repoRoot(), "frontend", "components", "BetaPrototypeTools.tsx"));
  const docs = [
    safeRead(path.join(repoRoot(), "docs", "teammate-test-guide.md")),
    safeRead(path.join(repoRoot(), "docs", "teammate-beta-invite-pack.md"))
  ].join("\n");
  const required = [
    "simulated QA access",
    "beta testing only",
    "not production auth",
    "not SSO",
    "not real user impersonation",
    "not permission delegation"
  ];
  const hasAll = (contents: string) => required.every((phrase) => contents.toLowerCase().includes(phrase.toLowerCase()));
  const appCopyReady = hasAll(tools);
  const docsReady = hasAll(docs);
  const ready = appCopyReady && docsReady;
  return fact({
    id: "beta-role-switch-copy",
    label: "Simulated role switch copy",
    ready,
    state: ready ? "pass" : "block",
    detail: ready
      ? "App and teammate docs label role switching as simulated local QA, not production access."
      : "Role switching needs explicit simulated local-only copy in both app and teammate docs.",
    source: "launch-readiness"
  });
}

function stopTestPolicyFact(): BetaReadinessFact {
  const docs = [
    safeRead(path.join(repoRoot(), "docs", "teammate-test-guide.md")),
    safeRead(path.join(repoRoot(), "docs", "teammate-beta-invite-pack.md")),
    safeRead(path.join(repoRoot(), "docs", "beta-readiness-command-center.md"))
  ].join("\n");
  const hasP0Policy = /P0|Critical/i.test(docs) && /stop (the )?test batch|stop testing/i.test(docs);
  const hasUnsafeCategories = /sensitive/i.test(docs) && /private/i.test(docs) && /youth-identifiable/i.test(docs) && /copyrighted/i.test(docs);
  const ready = hasP0Policy && hasUnsafeCategories;
  return fact({
    id: "beta-stop-test-policy",
    label: "P0 stop-test policy",
    ready,
    state: ready ? "pass" : "block",
    detail: ready
      ? "Teammate docs include stop-test rules and forbidden sensitive/private/youth/copyrighted media categories."
      : "Teammate docs need explicit stop-test policy plus forbidden sensitive/private/youth/copyrighted media categories.",
    source: "launch-readiness"
  });
}

function teamBetaSignoffFact(): BetaReadinessFact {
  const file = path.join(repoRoot(), "docs", "team-beta-signoff-record.md");
  const contents = safeRead(file);
  if (!contents) {
    return fact({
      id: "team-beta-owner-signoff",
      label: "Owner rehearsal signoff",
      ready: false,
      state: "block",
      detail: "Owner signoff record is missing. Keep teammate rehearsal on HOLD.",
      source: "launch-readiness"
    });
  }
  const currentDecision = /^Decision:\s*(GO|NO-GO)\s*$/im.exec(contents)?.[1] || "NO-GO";
  const finalDecision = /^Final decision:\s*(GO|NO-GO)\s*$/im.exec(contents)?.[1] || "NO-GO";
  const currentStatus = /^Current status:\s*(.+)$/im.exec(contents)?.[1] || "";
  const ready = currentDecision === "GO" && finalDecision === "GO" && !/NO-GO|pending|blocked|unproven/i.test(currentStatus);
  const currentDecisionLabel = currentDecision === "GO" ? "pass" : "hold";
  return fact({
    id: "team-beta-owner-signoff",
    label: "Owner rehearsal signoff",
    ready,
    state: ready ? "pass" : "block",
    detail: ready
      ? "Human signoff record allows tiny internal teammate rehearsal invite batch."
      : `Human signoff record is ${currentDecisionLabel}; teammate rehearsal stays HOLD until owner evidence changes to pass.`,
    source: "launch-readiness"
  });
}

function hosted181ProofFact(): BetaReadinessFact {
  const docs = [
    safeRead(path.join(repoRoot(), "docs", "team-beta-gap-audit-2026-06-18.md")),
    safeRead(path.join(repoRoot(), "docs", "team-beta-go-no-go-packet.md")),
    safeRead(path.join(repoRoot(), "docs", "team-beta-signoff-record.md"))
  ].join("\n");
  const proven = /Hosted 181-record content proof\s*\|[^|\n]*(PASS|proven)/i.test(docs)
    && !/Last stable hosted proof before this code still returned demo fallback|stable hosted count proof still needs|not proven/i.test(docs);
  return fact({
    id: "hosted-181-record-proof",
    label: "Hosted 181-record snapshot proof",
    ready: proven,
    state: proven ? "pass" : "block",
    detail: proven
      ? "Stable hosted URL has owner-approved proof for the 181-record rehearsal snapshot or live scoped source."
      : "Stable hosted URL has not proven the 181-record rehearsal snapshot; last known gap keeps teammate rehearsal on HOLD.",
    source: "launch-readiness"
  });
}

function durableFailClosedBoundaryFact(): BetaReadinessFact {
  const docs = [
    safeRead(path.join(repoRoot(), "docs", "team-beta-gap-audit-2026-06-18.md")),
    safeRead(path.join(repoRoot(), "docs", "team-beta-go-no-go-packet.md")),
    safeRead(path.join(repoRoot(), "docs", "team-beta-signoff-record.md"))
  ].join("\n");
  const proven = /durable runtime store|durable audit\/ticket storage|explicit no-download\/queued-review fail-closed/i.test(docs)
    && !/remains unproven|still needs scoped proof|persistence boundary.*NO-GO|PARTIAL/i.test(docs);
  return fact({
    id: "durable-fail-closed-boundary",
    label: "Durable/fail-closed boundary",
    ready: proven,
    state: proven ? "pass" : "block",
    detail: proven
      ? "Hosted write paths are either durable and auditable or explicitly fail-closed/queued for local rehearsal."
      : "Hosted durable state or explicit fail-closed/queued tester boundary is not proven for teammate rehearsal pass.",
    source: "launch-readiness"
  });
}

function seedDataFact(assetCount: number, portalReady: number): BetaReadinessFact {
  const ready = assetCount > 0;
  return fact({
    id: "seed-data",
    label: "Seed catalog data",
    ready,
    state: ready ? (portalReady > 0 ? "pass" : "warn") : "block",
    detail: ready
      ? `${assetCount.toLocaleString()} assets loaded; ${portalReady.toLocaleString()} portal-ready asset${portalReady === 1 ? "" : "s"}.`
      : "No media records are loaded.",
    source: "catalog"
  });
}

export function buildBetaReadiness({
  integrations,
  assetCount,
  portalReady,
  auditRecent
}: {
  integrations: IntegrationReadinessItem[];
  assetCount: number;
  portalReady: number;
  auditRecent: AuditEventSummary[];
}): BetaReadinessResult {
  const actorBackedAudit = auditRecent.filter((event) => Boolean(event.actor));
  const auditRoles = Array.from(new Set(actorBackedAudit.map((event) => event.role))).sort();
  const facts = [
    integrationFact(integrations, "auth", { label: "SSO / role identity", warnWhenReady: true }),
    integrationFact(integrations, "review-writes", { label: "ResourceSpace review writeback" }),
    integrationFact(integrations, "approved-copy-delivery", { label: "Approved copy derivatives" }),
    privateUrlFact(),
    seedDataFact(assetCount, portalReady),
    envFact(),
    allowlistFact(),
    betaRoleSwitchFact(),
    stopTestPolicyFact(),
    hosted181ProofFact(),
    durableFailClosedBoundaryFact(),
    teamBetaSignoffFact(),
    browserQaFact(),
    fact({
      id: "audit-evidence",
      label: "Audit evidence",
      ready: actorBackedAudit.length > 0,
      state: actorBackedAudit.length > 0 ? "pass" : "warn",
      detail: actorBackedAudit.length
        ? `${actorBackedAudit.length.toLocaleString()} recent actor-backed audit event${actorBackedAudit.length === 1 ? "" : "s"} available for local rehearsal across ${auditRoles.join(", ") || "unknown roles"}.`
        : "No recent audit events are visible yet.",
      source: "catalog"
    })
  ];
  const score = Math.round((facts.filter((item) => item.ready).length / facts.length) * 100);
  return {
    ready: facts.every((item) => item.ready || item.state === "warn")
      && facts.some((item) => item.id === "browser-qa" && item.ready)
      && facts.some((item) => item.id === "team-beta-owner-signoff" && item.ready),
    score,
    generatedAt: new Date().toISOString(),
    facts
  };
}
