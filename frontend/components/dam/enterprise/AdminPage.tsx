"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, Box, CheckCircle2, ClipboardCheck, Database, Download, FileText, Lock, MessageSquareWarning, RefreshCw, Shield, Users, XCircle } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useAdminReadiness } from "@/components/dam/useDamApi";
import { adminNavItems, adminNavLabel, integrationReadinessColumns, integrationState, policySummaryRows, systemHealthRows } from "@/lib/admin-control";
import { enterpriseMetadataSchemaRows, metadataSchemaHealthSummary } from "@/lib/enterprise-metadata";
import type { EnterpriseStatus } from "@/lib/enterprise-status";
import { mediaSourceIsLive } from "@/lib/media-source/truth";
import { canAccessRoute } from "@/lib/permissions";
import { routeWithRole } from "@/lib/role-routes";
import { taxonomyGovernanceTerms, taxonomyHealthSummary } from "@/lib/taxonomy";
import type { BetaFeedbackIncidentState, BetaFeedbackOwner, BetaFeedbackRecord, BetaFeedbackSeverity, BetaFeedbackStatus, BetaReadinessFact, DamReadinessResult, IntegrationReadinessItem } from "@/lib/types";
import { ActionButton, CustodyMapPanel, ErrorCard, KpiCard, LoadingCard, PageHeader, SourcePill, StatusBadge } from "./EnterpriseShared";

const roleRows = [
  ["Viewer", "Find approved media", "Approved copy only", "No", "No", "No"],
  ["Contributor", "Find and submit media", "Approved copy only", "Yes", "No", "No"],
  ["Reviewer", "Review evidence and decisions", "Role-gated previews", "Yes", "Yes", "No"],
  ["DAM Admin observer", "Read readiness and blockers", "Role-gated previews", "Yes", "Yes", "Read-only"],
  ["Prototype operator", "Configure rehearsal operations after proof", "Role-gated previews", "Yes", "Yes", "Controlled"]
];

const teamRows = [
  ["DAM Admin", "System owner", "Integrations, SSO readiness, audit evidence"],
  ["Reviewers", "Review owner", "Evidence checklist, rights decisions, pending writes"],
  ["Contributors", "Intake owner", "Upload packets and reviewer handoff"],
  ["Portal", "Access layer", "Search, download gates, analytics events"]
];

type AdminTruthState = "local-only" | "durable" | "blocked" | "not implemented" | "prototype-login" | "ignored" | "header-shim" | "not-proven";

type AdminTruthRow = {
  item: string;
  state: AdminTruthState;
  storage?: string;
  source?: string;
  truth: string;
  blocker: string;
};

const storageTruthRows: AdminTruthRow[] = [
  {
    item: "Audit logs",
    state: "local-only",
    storage: "Runtime JSONL audit files",
    truth: "Actor events exist as local accountability evidence. They are not durable production audit logs.",
    blocker: "Needs append-only durable audit store, identity-backed actor proof, backup, and restore test."
  },
  {
    item: "Download tickets",
    state: "local-only",
    storage: "Runtime JSON ticket files",
    truth: "Approved-copy ticket mint/consume is local runtime state and fails closed when durable production writes are missing.",
    blocker: "Needs durable expiring ticket store with one-time consume proof."
  },
  {
    item: "Review decisions",
    state: "local-only",
    storage: "Portal audit plus pending write queue",
    truth: "Portal review decisions can be queued locally. ResourceSpace remains final truth.",
    blocker: "Needs durable reviewer decision store and verified ResourceSpace sync handoff."
  },
  {
    item: "Pending ResourceSpace writes",
    state: "blocked",
    storage: "Runtime pending-write JSON files",
    truth: "Live ResourceSpace writeback is disabled unless explicit server env and field map proof exist.",
    blocker: "No live writeback proof. Pending writes are not ResourceSpace truth."
  },
  {
    item: "Package drafts",
    state: "local-only",
    storage: "Local JSON package draft records",
    truth: "Drafts do not grant share permission and are not durable package/share storage.",
    blocker: "Needs durable share draft store with audit, expiry, recipients, terms, and revocation."
  },
  {
    item: "Intake batches",
    state: "local-only",
    storage: "Runtime intake JSON and local originals staging",
    truth: "Browser intake creates review packets only. It does not publish, approve, or mutate source media.",
    blocker: "Production browser file intake needs durable storage or admin/Drive intake."
  },
  {
    item: "Saved searches",
    state: "local-only",
    storage: "Local JSON saved-search records",
    truth: "Saved views are prototype convenience only, not team profile durability.",
    blocker: "Needs team/user-scoped durable profile storage."
  },
  {
    item: "Feedback",
    state: "local-only",
    storage: "Local JSON unless KV/Blob are configured",
    truth: "Feedback can support local rehearsal triage only. It is not broad tester durability proof.",
    blocker: "Needs durable triage, attachment storage, owner/status audit trail, and export proof."
  },
  {
    item: "Usage events",
    state: "local-only",
    storage: "Local SQLite when enabled",
    truth: "Usage analytics must not be reported as success metrics until durable event logging exists.",
    blocker: "Needs durable event store before search, view, download, or trend metrics are claimed."
  }
];

const identityTruthRows: AdminTruthRow[] = [
  {
    item: "Demo role",
    state: "local-only",
    source: "Client role provider",
    truth: "Local prototype browsing only. Not authentication, not SSO, not real user impersonation.",
    blocker: "Replace with verified user identity before external access claims."
  },
  {
    item: "Prototype login",
    state: "prototype-login",
    source: "Signed session cookie plus middleware headers",
    truth: "Useful for rehearsal role checks, but not IdP-backed production identity.",
    blocker: "Needs real accounts, lifecycle, group mapping, and audit actor proof."
  },
  {
    item: "Query/body/script override",
    state: "ignored",
    source: "Explicit role strings from client or scripts",
    truth: "Production ignores client role overrides. Local override requires explicit server env.",
    blocker: "Never count override role strings as trusted identity."
  },
  {
    item: "SSO headers",
    state: "header-shim",
    source: "Trusted headers; production requires Cloudflare Access assertion",
    truth: "Header mapping code exists. Header mapping is not hosted IdP proof by itself.",
    blocker: "Needs hosted assertion, group claims, role map, and route smoke evidence."
  },
  {
    item: "Production trusted identity",
    state: "not-proven",
    source: "Required production identity gate",
    truth: "Production identity not proven. Missing trusted headers fail closed to Viewer.",
    blocker: "Prove IdP assertion, groups, audit actor integrity, session expiry, and no client override authority."
  }
];

const DEFAULT_ADMIN_NAV = "overview";
const DEFAULT_ADMIN_HASH = "governance";
const adminNavIds = new Set(adminNavItems.map((item) => item.id));
const adminHashByNav = new Map(adminNavItems.map((item) => [item.id, item.id]));
adminHashByNav.set(DEFAULT_ADMIN_NAV, DEFAULT_ADMIN_HASH);
const adminNavByHash = new Map(adminNavItems.map((item) => [item.id, item.id]));
adminNavByHash.set(DEFAULT_ADMIN_HASH, DEFAULT_ADMIN_NAV);
adminNavByHash.set("overview", DEFAULT_ADMIN_NAV);
adminNavByHash.set("users", "users-roles");
adminNavByHash.set("launch-readiness-section", DEFAULT_ADMIN_NAV);
adminNavByHash.set("governance-policies-section", DEFAULT_ADMIN_NAV);
adminNavByHash.set("audit-activity-section", DEFAULT_ADMIN_NAV);
adminNavByHash.set("system-health-section", DEFAULT_ADMIN_NAV);
const adminCanonicalHashAliases = new Map<string, string>([
  ["overview", DEFAULT_ADMIN_HASH],
  ["users", "users-roles"]
]);
const adminFocusTargetByHash = new Map<string, string>([
  [DEFAULT_ADMIN_HASH, "admin-launch-summary-title"],
  ["launch-readiness-section", "launch-readiness-section"],
  ["governance-policies-section", "governance-policies-section"],
  ["audit-activity-section", "audit-activity-section"],
  ["system-health-section", "system-health-section"]
]);

const adminPageIdentityByPath = new Map<string, { title: string; subtitle: string }>([
  ["/admin", { title: "Control Center", subtitle: "Local prototype status for source health, audit activity, storage honesty, identity proof, and policy-sensitive workflows." }],
  ["/governance/rights-consent", { title: "Rights & Consent", subtitle: "Evidence, consent, owner/license, minors, and public-use approvals." }],
  ["/governance/metadata-health", { title: "Metadata Health", subtitle: "Required fields, duplicate candidates, taxonomy drift, and orphaned records." }],
  ["/governance/policy-center", { title: "Policy Center", subtitle: "Download gates, source restrictions, roles, approval, consent, and expiration rules." }],
  ["/governance/audit-log", { title: "Audit Log", subtitle: "Upload, edit, approval, download, export, and policy events." }],
  ["/governance/integrations", { title: "Integrations", subtitle: "ResourceSpace, Google Shared Drive, portal, storage, and identity health." }],
  ["/admin/users", { title: "Users & Roles", subtitle: "Role-safe permissions and user assignments." }],
  ["/admin/taxonomy", { title: "Taxonomy", subtitle: "Ministry, event, collection, tag, and metadata vocabularies." }],
  ["/admin/settings", { title: "Settings", subtitle: "DAM workspace settings and operational controls." }]
]);

const adminModuleTitleByPath = new Map<string, string>([
  ["/admin", "Overview"],
  ["/governance/rights-consent", "Rights & Consent"],
  ["/governance/metadata-health", "Metadata Health"],
  ["/governance/policy-center", "Policy Center"],
  ["/governance/audit-log", "Audit Log"],
  ["/governance/integrations", "Integrations"],
  ["/admin/users", "Users & Roles"],
  ["/admin/taxonomy", "Taxonomy"],
  ["/admin/settings", "Settings"]
]);

const legacyAdminModuleMap = new Map<string, string>([
  ["dashboard", DEFAULT_ADMIN_NAV],
  ["rights", "rights-policies"],
  ["metadata", "metadata-schemas"],
  ["policy", "rights-policies"],
  ["audit", "audit-logs"],
  ["integrations", "integrations"],
  ["settings", "system-settings"],
  ["users", "users-roles"],
  ["taxonomy", "taxonomy"]
]);

function normalizeAdminInitialModule(value?: string) {
  if (!value) return DEFAULT_ADMIN_NAV;
  const mapped = legacyAdminModuleMap.get(value) || value;
  return adminNavIds.has(mapped) ? mapped : DEFAULT_ADMIN_NAV;
}

type AdminNavSelectionOptions = {
  focusTargetId?: string;
  hash?: string;
  scroll?: boolean;
};

type SelectAdminModule = (id: string, options?: AdminNavSelectionOptions) => void;

const feedbackStatuses: BetaFeedbackStatus[] = ["new", "triaged", "agent-ready", "fixed", "wont-fix"];
const feedbackSeverities: Array<BetaFeedbackSeverity | "all"> = ["all", "critical", "high", "medium", "low"];
const feedbackOwners: BetaFeedbackOwner[] = ["unassigned", "Hali", "Enoch", "Reviewer", "Codex", "Admin"];
const feedbackIncidentStates: BetaFeedbackIncidentState[] = ["none", "watch", "triggered", "resolved"];
type AdminStatusTone = "Critical" | "Warning" | "Healthy" | "Info" | "Disabled";

function readAdminHash() {
  try {
    return decodeURIComponent(window.location.hash.replace(/^#/, ""));
  } catch {
    return window.location.hash.replace(/^#/, "");
  }
}

function replaceAdminHash(hash: string) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}#${hash}`);
}

function canonicalAdminHash(hash: string, navId: string) {
  const alias = adminCanonicalHashAliases.get(hash);
  if (alias) return alias;
  if (adminFocusTargetByHash.has(hash)) return hash;
  return adminHashByNav.get(navId) || DEFAULT_ADMIN_HASH;
}

function focusAdminTarget(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  if (target instanceof HTMLElement) target.focus({ preventScroll: true });
}

function AdminStatusBadge({ tone, label = tone }: { tone: AdminStatusTone; label?: string }) {
  const Icon = tone === "Critical" ? XCircle : tone === "Warning" ? AlertTriangle : tone === "Healthy" ? CheckCircle2 : tone === "Disabled" ? Lock : Shield;
  return <span className={`ed-admin-status is-${tone.toLowerCase()}`}><Icon size={13} aria-hidden="true" />{label}</span>;
}

function truthStateTone(state: AdminTruthState): AdminStatusTone {
  if (state === "durable") return "Healthy";
  if (state === "blocked" || state === "not-proven") return "Critical";
  if (state === "not implemented" || state === "ignored") return "Disabled";
  return "Warning";
}

function truthStateLabel(state: AdminTruthState) {
  if (state === "not-proven") return "Not production-proven";
  if (state === "prototype-login") return "Prototype login";
  if (state === "header-shim") return "Header shim";
  return state;
}

function TruthMatrixTable({ rows, mode }: { rows: AdminTruthRow[]; mode: "storage" | "identity" }) {
  return (
    <>
      <div className="ed-mobile-card-list ed-admin-truth-details" aria-label={`${mode} truth matrix`}>
        {rows.map((row) => (
          <details className="ed-admin-mobile-detail" key={row.item}>
            <summary>
              <span><strong>{row.item}</strong><small>{row.storage || row.source}</small></span>
              <AdminStatusBadge tone={truthStateTone(row.state)} label={truthStateLabel(row.state)} />
            </summary>
            <p><strong>Truth:</strong> {row.truth}</p>
            <p><strong>Blocker:</strong> {row.blocker}</p>
          </details>
        ))}
      </div>
      <table className="ed-table ed-desktop-table">
        <thead>
          <tr>
            <th>{mode === "storage" ? "State" : "Identity path"}</th>
            <th>Status</th>
            <th>{mode === "storage" ? "Store" : "Source"}</th>
            <th>Truth</th>
            <th>Blocker</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.item}>
              <td><strong>{row.item}</strong></td>
              <td><AdminStatusBadge tone={truthStateTone(row.state)} label={truthStateLabel(row.state)} /></td>
              <td>{row.storage || row.source}</td>
              <td>{row.truth}</td>
              <td>{row.blocker}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function factTone(fact?: { state?: BetaReadinessFact["state"] | string; ready?: boolean }): AdminStatusTone {
  if (!fact) return "Info";
  if (fact.state === "block") return "Critical";
  if (fact.state === "warn") return "Warning";
  return "Healthy";
}

function enterpriseTone(status: EnterpriseStatus): AdminStatusTone {
  if (status === "Operational" || status === "Approved" || status === "Active" || status === "Compliant" || status === "Approved only") return "Healthy";
  if (status === "Read-only") return "Disabled";
  if (status === "Blocked" || status === "Not configured" || status === "Restricted" || status === "Missing Consent") return "Critical";
  if (status === "Degraded" || status === "Pending setup" || status === "Needs Review" || status === "Expiring Soon") return "Warning";
  return "Info";
}

function integrationTone(row: IntegrationReadinessItem): AdminStatusTone {
  return enterpriseTone(integrationState(row));
}

function betaFactClass(fact: BetaReadinessFact) {
  if (fact.state === "pass") return "is-pass";
  if (fact.state === "block") return "is-block";
  return "is-warn";
}

function betaFactIcon(fact: BetaReadinessFact) {
  if (fact.state === "pass") return <CheckCircle2 size={16} aria-hidden="true" />;
  if (fact.state === "block") return <XCircle size={16} aria-hidden="true" />;
  return <AlertTriangle size={16} aria-hidden="true" />;
}

function betaFactSourceLabel(source: BetaReadinessFact["source"]) {
  return source.replace(/-/g, " ");
}

type GovernanceQueueItem = {
  fact: BetaReadinessFact;
  severity: "Critical" | "Warning";
  actionTitle: string;
  evidenceMeta: string;
  evidenceTarget: string;
};

function governanceActionTitle(fact: BetaReadinessFact) {
  if (fact.state === "block" && fact.source === "launch-readiness") return "Resolve local rehearsal blocker";
  if (fact.source === "integration") return "Review integration evidence";
  if (fact.source === "environment" || fact.source === "git-hygiene") return "Verify policy exception";
  if (fact.state === "block") return "Review blocker evidence";
  return "Verify policy exception";
}

function governanceEvidenceTarget(fact: BetaReadinessFact) {
  if (fact.source === "integration") return "system-health-section";
  if (fact.id === "audit-evidence" || fact.source === "catalog") return "audit-activity-section";
  if (fact.source === "environment" || fact.source === "git-hygiene" || fact.source === "launch-readiness" || fact.source === "qa-report") return "launch-readiness-section";
  return "governance-policies-section";
}

function governanceEvidenceMeta(fact: BetaReadinessFact, readiness?: DamReadinessResult | null) {
  const integration = (readiness?.integrationReadiness || []).find((row) => row.id === fact.id);
  if (integration) return `${integration.owner} · ${integrationState(integration)}`;
  if (fact.source === "qa-report") return "Browser/API smoke evidence";
  if (fact.source === "catalog") return readiness?.auditLog.latestAt ? `Last audit activity ${readiness.auditLog.latestAt}` : "Catalog governance fact";
  if (fact.source === "launch-readiness") return readiness?.betaReadiness.generatedAt ? `Rehearsal fact generated ${new Date(readiness.betaReadiness.generatedAt).toLocaleString()}` : "Local rehearsal fact";
  if (fact.source === "environment") return "Runtime environment fact";
  if (fact.source === "git-hygiene") return "Git hygiene fact";
  return betaFactSourceLabel(fact.source);
}

function governanceQueueItems(readiness?: DamReadinessResult | null): GovernanceQueueItem[] {
  const facts = readiness?.betaReadiness.facts || [];
  return facts
    .filter((fact) => fact.state === "block" || fact.state === "warn")
    .sort((left, right) => (left.state === right.state ? 0 : left.state === "block" ? -1 : 1))
    .map((fact) => ({
      fact,
      severity: fact.state === "block" ? "Critical" : "Warning",
      actionTitle: governanceActionTitle(fact),
      evidenceMeta: governanceEvidenceMeta(fact, readiness),
      evidenceTarget: governanceEvidenceTarget(fact)
    }));
}

function LaunchReadinessSummary({ readiness, onSelectModule }: { readiness?: DamReadinessResult | null; onSelectModule: SelectAdminModule }) {
  const beta = readiness?.betaReadiness;
  const facts = beta?.facts || [];
  const blockers = facts.filter((item) => item.state === "block");
  const warnings = facts.filter((item) => item.state === "warn");
  const qaFact = facts.find((item) => item.id === "browser-qa") || facts.find((item) => item.source === "qa-report");
  const auditActivity = readiness?.auditLog.recent[0];
  const launchFact = facts.find((item) => item.source === "launch-readiness" && item.state !== "pass") || facts.find((item) => item.source === "launch-readiness");
  const stateTone: AdminStatusTone = beta?.ready ? "Healthy" : blockers.length ? "Critical" : "Warning";
  const stateLabel = beta?.ready ? "Local rehearsal checks pass" : blockers.length ? "Local rehearsal HOLD" : "Local rehearsal hold";
  const queueItems = governanceQueueItems(readiness);
  const primaryQueueItem = queueItems[0];
  const remainingQueueItems = queueItems.slice(1);

  function viewEvidence(event: MouseEvent<HTMLAnchorElement>, targetId: string) {
    event.preventDefault();
    onSelectModule(DEFAULT_ADMIN_NAV, { focusTargetId: targetId, hash: targetId });
  }

  return (
    <section id={DEFAULT_ADMIN_HASH} className={`ed-card ed-launch-summary is-${stateTone.toLowerCase()}`} aria-labelledby="admin-launch-summary-title">
      <div className="ed-launch-summary-primary">
        <div>
          <span className="ed-section-eyebrow">Local prototype</span>
          <h2 id="admin-launch-summary-title" tabIndex={-1}>{stateLabel}</h2>
          <p>{beta?.ready ? "Local rehearsal checks passed. This is still not beta-ready until hosted durability, production-proven identity, catalog proof, and owner signoff are complete." : blockers.length ? "Resolve critical blockers before any teammate rehearsal invite." : "Proceed with local rehearsal only until warnings are accepted or cleared."}</p>
        </div>
        <div className="ed-launch-verdict">
          <AdminStatusBadge tone={stateTone} label={stateLabel} />
          <strong>{beta?.score || 0}%</strong>
          <span>proof score</span>
        </div>
      </div>
      <div className="ed-governance-queue" aria-labelledby="governance-action-queue-title">
        <header>
          <div>
            <span className="ed-section-eyebrow">Governance Action Queue</span>
            <h3 id="governance-action-queue-title">Exception-first rehearsal work</h3>
            <p>Critical blockers first, warnings second. Evidence links stay inside existing governance sections.</p>
          </div>
          <div className="ed-governance-queue-counts" aria-label={`${blockers.length} critical blockers and ${warnings.length} warnings`}>
            <span><strong>{blockers.length}</strong> Critical blockers</span>
            <span><strong>{warnings.length}</strong> Warnings</span>
          </div>
        </header>
        <div className="ed-governance-queue-list">
          {primaryQueueItem ? (
            <>
              <article className={`is-${primaryQueueItem.severity.toLowerCase()}`} key={primaryQueueItem.fact.id}>
                <div className="ed-governance-queue-main">
                  <AdminStatusBadge tone={primaryQueueItem.severity} label={primaryQueueItem.severity} />
                  <div>
                    <h4>{primaryQueueItem.actionTitle}</h4>
                    <p>{primaryQueueItem.fact.detail}</p>
                  </div>
                </div>
                <div className="ed-governance-queue-meta">
                  <span>{primaryQueueItem.fact.label}</span>
                  <small>{primaryQueueItem.evidenceMeta}</small>
                  <a href={`#${primaryQueueItem.evidenceTarget}`} aria-label={`View evidence for ${primaryQueueItem.fact.label}`} onClick={(event) => viewEvidence(event, primaryQueueItem.evidenceTarget)}>View evidence</a>
                </div>
              </article>
              {remainingQueueItems.length ? (
                <details className="ed-governance-queue-more">
                  <summary>More rehearsal actions: {remainingQueueItems.filter((item) => item.severity === "Critical").length} critical, {remainingQueueItems.filter((item) => item.severity === "Warning").length} warnings</summary>
                  <div className="ed-governance-queue-list">
                    {remainingQueueItems.map((item) => (
                      <article className={`is-${item.severity.toLowerCase()}`} key={item.fact.id}>
                        <div className="ed-governance-queue-main">
                          <AdminStatusBadge tone={item.severity} label={item.severity} />
                          <div>
                            <h4>{item.actionTitle}</h4>
                            <p>{item.fact.detail}</p>
                          </div>
                        </div>
                        <div className="ed-governance-queue-meta">
                          <span>{item.fact.label}</span>
                          <small>{item.evidenceMeta}</small>
                          <a href={`#${item.evidenceTarget}`} aria-label={`View evidence for ${item.fact.label}`} onClick={(event) => viewEvidence(event, item.evidenceTarget)}>View evidence</a>
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : (
            <article className="is-healthy">
              <div className="ed-governance-queue-main">
                <AdminStatusBadge tone="Healthy" />
                <div>
                  <h4>No open rehearsal exceptions</h4>
                  <p>Keep scheduled smoke, audit export, and reviewer proof current during local rehearsal.</p>
                </div>
              </div>
              <div className="ed-governance-queue-meta">
                <span>Rehearsal evidence</span>
                <small>Current readiness facts</small>
                <a href="#launch-readiness-section" aria-label="View rehearsal evidence" onClick={(event) => viewEvidence(event, "launch-readiness-section")}>View evidence</a>
              </div>
            </article>
          )}
        </div>
      </div>
      <details className="ed-launch-evidence-detail">
        <summary>Local rehearsal evidence, audit activity, and system facts</summary>
        <div className="ed-launch-facts" aria-label="Local rehearsal facts">
          <article className={blockers.length ? "is-critical" : "is-healthy"}>
            <AdminStatusBadge tone={blockers.length ? "Critical" : "Healthy"} label={blockers.length ? "Critical" : "Healthy"} />
            <strong>{blockers.length}</strong>
            <span>Blockers</span>
            <p>{blockers[0]?.detail || "No invite-stopping blockers reported."}</p>
          </article>
          <article className={warnings.length ? "is-warning" : "is-healthy"}>
            <AdminStatusBadge tone={warnings.length ? "Warning" : "Healthy"} label={warnings.length ? "Warning" : "Healthy"} />
            <strong>{warnings.length}</strong>
            <span>Warnings</span>
            <p>{warnings[0]?.detail || "No warning follow-ups reported."}</p>
          </article>
          <article>
            <AdminStatusBadge tone={factTone(qaFact)} label={qaFact?.ready ? "Healthy" : qaFact?.state === "block" ? "Critical" : "Warning"} />
            <strong>{qaFact?.ready ? "Passed" : "Check"}</strong>
            <span>Last smoke/API check</span>
            <p>{qaFact?.detail || "Run browser QA and portal API smoke before invite batch."}</p>
          </article>
          <article>
            <AdminStatusBadge tone={auditActivity?.actor ? "Healthy" : "Warning"} label={auditActivity?.actor ? "Healthy" : "Warning"} />
            <strong>{readiness?.auditLog.latestAt || auditActivity?.createdAt || "No activity"}</strong>
            <span>Last audit activity</span>
            <p>{auditActivity ? `${auditActivity.actor || "Unknown actor"}: ${auditActivity.summary}` : "No actor-backed governance event visible yet."}</p>
          </article>
          <article>
            <AdminStatusBadge tone={factTone(launchFact)} label={launchFact?.state === "block" ? "Critical" : launchFact?.state === "warn" ? "Warning" : "Healthy"} />
            <strong>{launchFact?.ready ? "Current" : "Review"}</strong>
            <span>Governance activity</span>
            <p>{launchFact?.detail || "Local rehearsal facts are loading."}</p>
          </article>
        </div>
      </details>
    </section>
  );
}

function betaCoverageGates(readiness?: DamReadinessResult | null) {
  const facts = readiness?.betaReadiness.facts || [];
  const fact = (id: string) => facts.find((item) => item.id === id);
  const fieldMappings = readiness?.fieldMappings || [];
  const requiredFields = fieldMappings.filter((item) => item.required);
  const requiredMapped = requiredFields.filter((item) => item.resourceSpaceField && item.coverage > 0);
  const requiredCoverage = requiredFields.length ? Math.round(requiredFields.reduce((sum, item) => sum + item.coverage, 0) / requiredFields.length) : 0;
  const browserQa = fact("browser-qa");
  const stopPolicy = fact("beta-stop-test-policy");
  const roleCopy = fact("beta-role-switch-copy");
  const auditReady = fact("audit-evidence");
  return [
    {
      id: "qa",
      label: "Browser QA coverage",
      value: browserQa?.ready ? "Pass" : "Missing",
      detail: browserQa?.detail || "No browser QA fact loaded.",
      state: browserQa?.state || "warn"
    },
    {
      id: "metadata",
      label: "Required field coverage",
      value: `${requiredCoverage}%`,
      detail: `${requiredMapped.length}/${requiredFields.length || 0} required ResourceSpace mappings have data.`,
      state: requiredCoverage >= 90 ? "pass" : requiredCoverage >= 70 ? "warn" : "block"
    },
    {
      id: "audit",
      label: "Actor audit proof",
      value: auditReady?.ready ? "Present" : "Needed",
      detail: auditReady?.detail || "No actor-backed audit fact loaded.",
      state: auditReady?.state || "warn"
    },
    {
      id: "policy",
      label: "Tester safety policy",
      value: stopPolicy?.ready && roleCopy?.ready ? "Clear" : "Review",
      detail: stopPolicy?.ready && roleCopy?.ready ? "Stop-test rules and simulated role copy are documented." : "Confirm stop-test policy and local-only role copy before invite batch.",
      state: stopPolicy?.state === "pass" && roleCopy?.state === "pass" ? "pass" : "block"
    }
  ];
}

function betaNextActions(readiness?: DamReadinessResult | null) {
  const facts = readiness?.betaReadiness.facts || [];
  if (!facts.length) {
    return [
      "Restore readiness data before making rehearsal or invite decisions.",
      "Rerun browser QA and hosted smoke after readiness data is available.",
      "Keep ResourceSpace writeback and public launch claims disabled."
    ];
  }
  const blocked = facts.filter((item) => item.state === "block");
  const warnings = facts.filter((item) => item.state === "warn");
  const actions = [...blocked, ...warnings].slice(0, 5).map((item) => `${item.label}: ${item.detail}`);
  if (actions.length) return actions;
  return [
    "Run hosted smoke against invite URL before teammate batch.",
    "Export Feedback Inbox after first local rehearsal pass.",
    "Keep ResourceSpace writeback disabled unless owner approves."
  ];
}

function nextBatchDecision(readiness?: DamReadinessResult | null) {
  const facts = readiness?.betaReadiness.facts || [];
  if (!facts.length) {
    return {
      tone: "Warning" as AdminStatusTone,
      label: "Readiness unavailable",
      detail: "Readiness facts are not loaded; absence of blockers is not a pass.",
      action: "Restore readiness data, rerun browser QA and hosted smoke, then decide rehearsal users."
    };
  }
  const p0GateIds = ["hosted-181-record-proof", "durable-fail-closed-boundary", "team-beta-owner-signoff"];
  const p0Blocks = facts.filter((item) => p0GateIds.includes(item.id) && !item.ready);
  const blockers = facts.filter((item) => item.state === "block");
  const warnings = facts.filter((item) => item.state === "warn");
  if (p0Blocks.length) {
    return {
      tone: "Critical" as AdminStatusTone,
      label: "Rehearsal HOLD",
      detail: `${p0Blocks.length}/3 P0 gates blocked: ${p0Blocks.map((item) => item.label).join(", ")}.`,
      action: "No teammate rehearsal invite approval. Need hosted 181 proof, durable/fail-closed boundary, and Hali/Enoch signoff before invites."
    };
  }
  if (blockers.length) {
    return {
      tone: "Critical" as AdminStatusTone,
      label: "Rehearsal HOLD",
      detail: `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} remain after signoff check.`,
      action: "Clear critical blockers before any teammate rehearsal batch."
    };
  }
  return {
    tone: warnings.length ? "Warning" as AdminStatusTone : "Healthy" as AdminStatusTone,
    label: warnings.length ? "Owner review needed" : "Local rehearsal pass",
    detail: warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"} need owner acceptance.` : "No readiness blockers reported; still verify current hosted smoke before any invite.",
    action: warnings.length ? "Owner accepts warnings or waits for fixes before rehearsal continues." : "Run invite URL smoke, export feedback packet, then owner decides next named rehearsal users."
  };
}

function BetaCommandCenter({ readiness, compact = false }: { readiness?: DamReadinessResult | null; compact?: boolean }) {
  const beta = readiness?.betaReadiness;
  const facts = beta?.facts || [];
  const blocked = facts.filter((item) => item.state === "block");
  const warnings = facts.filter((item) => item.state === "warn");
  const passes = facts.filter((item) => item.state === "pass");
  const coverageGates = betaCoverageGates(readiness);
  const nextBatch = nextBatchDecision(readiness);
  const recommendation = beta?.ready
    ? "Local rehearsal checks passed"
    : blocked.length
      ? "Hold until blockers clear"
      : "Dry-run only until proof is current";
  const statusClass = beta?.ready ? "is-pass" : blocked.length ? "is-block" : "is-warn";

  if (compact) {
    return (
      <section className="ed-card ed-beta-command-center is-compact">
        <header className="ed-card-head"><div><h3>Local rehearsal evidence</h3><p>{recommendation}</p></div><AdminStatusBadge tone={beta?.ready ? "Healthy" : blocked.length ? "Critical" : "Warning"} label={beta?.ready ? "Rehearsal pass" : "Hold"} /></header>
        <div className="ed-beta-mini-grid">
          <span><strong>{passes.length}</strong><small>pass</small></span>
          <span><strong>{warnings.length}</strong><small>warn</small></span>
          <span><strong>{blocked.length}</strong><small>block</small></span>
        </div>
        {betaNextActions(readiness).slice(0, 3).map((action) => <p className="ed-beta-action" key={action}>{action}</p>)}
      </section>
    );
  }

  return (
    <section className="ed-card ed-admin-module ed-beta-command-center" aria-label="Local rehearsal readiness evidence">
      <header className="ed-card-head">
        <div>
          <h3>Local rehearsal readiness</h3>
          <p>Pass/hold evidence for teammate rehearsal. Blocks are invite stoppers; warnings are rehearsal follow-ups.</p>
        </div>
        <AdminStatusBadge tone={beta?.ready ? "Healthy" : blocked.length ? "Critical" : "Warning"} label={recommendation} />
      </header>
      <div className="ed-admin-stat-grid">
        <article><strong>{beta?.score || 0}%</strong><span>local proof score</span><small>{beta?.generatedAt ? `generated ${new Date(beta.generatedAt).toLocaleString()}` : "not generated"}</small></article>
        <article><strong>{blocked.length}</strong><span>invite blockers</span><small>{warnings.length} warnings</small></article>
        <article><strong>{passes.length}/{facts.length || 0}</strong><span>facts passing</span><small>from script, QA, env, catalog</small></article>
      </div>
      <div className="ed-beta-coverage-grid" aria-label="Local rehearsal coverage gates">
        {coverageGates.map((gate) => <article className={`ed-beta-gate is-${gate.state}`} key={gate.id}><AdminStatusBadge tone={factTone(gate)} label={gate.state === "pass" ? "Healthy" : gate.state === "block" ? "Critical" : "Warning"} /><strong>{gate.value}</strong><span>{gate.label}</span><p>{gate.detail}</p></article>)}
      </div>
      <details className="ed-beta-fact-disclosure">
        <summary>Read all readiness facts</summary>
        <div className="ed-beta-fact-grid">
          {facts.map((fact) => (
            <article className={`ed-beta-fact ${betaFactClass(fact)}`} key={fact.id}>
              <span>{betaFactIcon(fact)}{fact.state}</span>
              <strong>{fact.label}</strong>
              <p>{fact.detail}</p>
              <small>{betaFactSourceLabel(fact.source)}</small>
            </article>
          ))}
        </div>
      </details>
      <section className="ed-beta-next-actions">
        <h4>Next rehearsal decision</h4>
        <article className="ed-next-batch-decision">
          <AdminStatusBadge tone={nextBatch.tone} label={nextBatch.label} />
          <strong>{nextBatch.detail}</strong>
          <p>{nextBatch.action}</p>
        </article>
        <div className="ed-next-batch-gates" aria-label="P0 local rehearsal gates">
          {["hosted-181-record-proof", "durable-fail-closed-boundary", "team-beta-owner-signoff"].map((id) => {
            const fact = facts.find((item) => item.id === id);
            return <p className={fact?.ready ? "is-ready" : "is-blocked"} key={id}><strong>{fact?.label || id}</strong><span>{fact?.detail || "Gate not reported."}</span></p>;
          })}
        </div>
        <h4>Next actions</h4>
        {betaNextActions(readiness).map((action) => <p key={action}>{action}</p>)}
      </section>
    </section>
  );
}

function AdminSourceNotice({ loading, error }: { loading: boolean; error?: string | null }) {
  if (!loading && !error) return null;
  const Icon = loading ? RefreshCw : AlertTriangle;

  return (
    <section className={`ed-admin-source-notice ${error ? "is-offline" : "is-loading"}`} aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{loading ? "Loading readiness data" : "ResourceSpace data unavailable"}</strong>
        <p>{loading ? "Admin modules will hydrate when readiness finishes loading." : "Live DAM metrics are unavailable. Static governance views remain visible; writes and launch claims stay disabled."}</p>
      </div>
      {error ? <span>{error}</span> : null}
    </section>
  );
}

function AdminRiskStrip({ readiness, disconnected }: { readiness?: DamReadinessResult | null; disconnected: boolean }) {
  const sourceLabel = disconnected ? "Disconnected" : readiness?.source.label || "Checking";
  const proofScore = readiness?.betaReadiness?.score ?? readiness?.score ?? 0;

  return (
    <section className="ed-admin-mobile-truth" aria-label="Admin readiness summary">
      <span><strong>Local prototype</strong><small>Read-only observer</small></span>
      <span><strong>ResourceSpace</strong><small>{sourceLabel}</small></span>
      <span><strong>Durable state</strong><small>Missing</small></span>
      <span><strong>Identity</strong><small>Not production-proven</small></span>
      <span><strong>Proof score</strong><small>{proofScore}%</small></span>
    </section>
  );
}

function AdminRail({ readiness, onSelectModule }: { readiness?: DamReadinessResult | null; onSelectModule: SelectAdminModule }) {
  const hasReadiness = Boolean(readiness);
  const healthRows = systemHealthRows(readiness);
  const recentActivity = (readiness?.auditLog.recent || []).slice(0, 4);

  return (
    <aside className="ed-admin-rail" aria-label="Admin status summary">
      <section className="ed-card ed-admin-rail-summary">
        <header className="ed-card-head">
          <div>
            <h3>Readiness Snapshot</h3>
            <p>{hasReadiness ? readiness?.source.detail : "Live readiness is not loaded."}</p>
          </div>
          <AdminStatusBadge tone={hasReadiness ? "Warning" : "Disabled"} label={hasReadiness ? "Read-only" : "Offline"} />
        </header>
        {hasReadiness ? (
          policySummaryRows(readiness).map((row) => <p className="ed-row-between" key={row.label}><span>{row.label}</span><strong>{row.value.toLocaleString()}</strong></p>)
        ) : (
          <p className="ed-empty-copy">Counts hidden while ResourceSpace is unavailable. No zeroes shown as success.</p>
        )}
        <ActionButton onClick={() => onSelectModule("rights-policies")}>Open policies</ActionButton>
      </section>
      <section className="ed-card">
        <header className="ed-card-head"><h3>Recent Activity</h3><button className="ed-link-button" type="button" onClick={() => onSelectModule("audit-logs")}>Activity</button></header>
        {recentActivity.length ? recentActivity.map((item) => <p className="ed-activity" key={item.id}><Bell size={16} />{item.summary}<small>{item.actor ? `${item.actor} · ` : ""}{item.role} · {item.createdAt}</small></p>) : <p className="ed-empty-copy">No actor-backed activity loaded.</p>}
      </section>
      <section className="ed-card">
        <h3>Integration Health</h3>
        {healthRows.length ? healthRows.map((item) => <p className="ed-row-between" key={item.id}><span>{item.label}</span><StatusBadge status={item.state} /></p>) : <p className="ed-empty-copy">No integration rows loaded.</p>}
        <button className="ed-link-button" type="button" onClick={() => onSelectModule("integrations")}>Open integrations</button>
      </section>
    </aside>
  );
}

function FeedbackInboxModule({ compact = false }: { compact?: boolean } = {}) {
  const [feedback, setFeedback] = useState<BetaFeedbackRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<BetaFeedbackStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<BetaFeedbackSeverity | "all">("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadFeedback() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/beta-feedback", { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(payload.error || "Feedback inbox failed to load.");
      return;
    }
    setFeedback(payload.feedback || []);
  }

  useEffect(() => {
    void loadFeedback();
  }, []);

  const routes = useMemo(() => ["all", ...Array.from(new Set(feedback.map((item) => item.route.split("?")[0]).filter(Boolean))).sort()], [feedback]);
  const roles = useMemo(() => ["all", ...Array.from(new Set(feedback.map((item) => item.role))).sort()], [feedback]);
  const storageModes = useMemo(() => Array.from(new Set(feedback.map((item) => item.storageMode))).sort(), [feedback]);
  const filtered = useMemo(() => feedback.filter((item) => (
    (statusFilter === "all" || item.status === statusFilter)
    && (severityFilter === "all" || item.severity === severityFilter)
    && (routeFilter === "all" || item.route.startsWith(routeFilter))
    && (roleFilter === "all" || item.role === roleFilter)
  )), [feedback, roleFilter, routeFilter, severityFilter, statusFilter]);

  async function updateFeedback(id: string, patch: Partial<Pick<BetaFeedbackRecord, "status" | "severity" | "owner" | "incidentState" | "notes">>) {
    const response = await fetch(`/api/beta-feedback/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(patch)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Feedback update failed.");
      return;
    }
    setFeedback((current) => current.map((item) => (item.id === id ? payload.feedback : item)));
  }

  async function exportJson() {
    const params = new URLSearchParams({
      status: statusFilter,
      severity: severityFilter,
      feedbackRole: roleFilter,
      route: routeFilter
    });
    const response = await fetch(`/api/beta-feedback/export?${params.toString()}`, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      setMessage(payload?.error || "Feedback export failed.");
      return;
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `tjc-beta-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="ed-card ed-admin-module beta-feedback-inbox">
      <header className="ed-card-head">
        <div><h3>Feedback Inbox</h3><p>Teammate reports from local rehearsal task mode. Use agent-ready for implementation backlog.</p></div>
        <div className="beta-feedback-actions">
          <button className="ed-link-button" type="button" onClick={() => void loadFeedback()}><RefreshCw size={14} />Refresh</button>
          <button className="ed-link-button" type="button" onClick={() => void exportJson()}><Download size={14} />Export JSON</button>
        </div>
      </header>
      <div className="ed-admin-stat-grid">
        <article><strong>{feedback.filter((item) => !["fixed", "wont-fix"].includes(item.status)).length.toLocaleString()}</strong><span>open reports</span><small>{feedback.length.toLocaleString()} total</small></article>
        <article><strong>{feedback.filter((item) => item.severity === "critical" || item.severity === "high").length.toLocaleString()}</strong><span>high priority</span><small>critical + high</small></article>
        <article><strong>{feedback.filter((item) => item.owner === "unassigned").length.toLocaleString()}</strong><span>unassigned</span><small>needs owner before next batch</small></article>
        <article><strong>{feedback.filter((item) => item.incidentState === "triggered" || item.incidentState === "watch").length.toLocaleString()}</strong><span>incident watch</span><small>watch + triggered</small></article>
      </div>
      <section className="ed-feedback-decision-strip" aria-label="Feedback triage operating rule">
        <AdminStatusBadge tone={feedback.some((item) => item.incidentState === "triggered") ? "Critical" : feedback.some((item) => item.owner === "unassigned" && !["fixed", "wont-fix"].includes(item.status)) ? "Warning" : "Info"} label={feedback.some((item) => item.incidentState === "triggered") ? "Hold" : "Triage"} />
        <div>
          <strong>{feedback.some((item) => item.incidentState === "triggered") ? "Next batch paused by incident trigger." : "Next batch needs zero critical open reports and assigned owners."}</strong>
          <p>Export current filters for owner review. Critical or privacy/safety feedback should move to incident watch before more testers are invited.</p>
          <p>Feedback storage shown here: {storageModes.length ? storageModes.join(", ") : "no records yet"}. `local-json` is local snapshot evidence, not hosted durability proof.</p>
        </div>
      </section>
      <div className="beta-feedback-filters">
        <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BetaFeedbackStatus | "all")}>{["all", ...feedbackStatuses].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Severity<select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as BetaFeedbackSeverity | "all")}>{feedbackSeverities.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Route<select value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}>{routes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Role<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {loading ? <LoadingCard label="Loading local rehearsal feedback..." /> : message ? <ErrorCard message={message} /> : (
        <div className="beta-feedback-list">
          {filtered.length ? filtered.map((item) => (
            <article className="beta-feedback-item" key={item.id}>
              <header>
                <div><strong>{item.task}</strong><small>{item.role} · {item.route} · {new Date(item.createdAt).toLocaleString()}</small></div>
                <span className={`beta-severity is-${item.severity}`}>{item.severity}</span>
              </header>
              <details className="ed-admin-mobile-detail beta-feedback-detail" open={!compact}>
                <summary><span><strong>Report details</strong><small>{item.owner} · {item.incidentState}</small></span></summary>
                <dl>
                  <div><dt>Expected</dt><dd>{item.expected}</dd></div>
                  <div><dt>Actual</dt><dd>{item.actual}</dd></div>
                  <div><dt>Owner</dt><dd>{item.owner} · {item.incidentState}{item.incidentId ? ` · ${item.incidentId}` : ""}</dd></div>
                  <div><dt>Context</dt><dd>{[item.browser, item.device, item.viewport].filter(Boolean).join(" · ") || "No device context"}</dd></div>
                </dl>
                {item.attachmentUrl ? <a className="beta-feedback-attachment" href={item.attachmentUrl} target="_blank" rel="noreferrer">Open attachment</a> : null}
                <footer>
                  <label>Status<select value={item.status} onChange={(event) => void updateFeedback(item.id, { status: event.target.value as BetaFeedbackStatus })}>{feedbackStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label>Severity<select value={item.severity} onChange={(event) => void updateFeedback(item.id, { severity: event.target.value as BetaFeedbackSeverity })}>{feedbackSeverities.filter((value) => value !== "all").map((severity) => <option key={severity}>{severity}</option>)}</select></label>
                  <label>Owner<select value={item.owner} onChange={(event) => void updateFeedback(item.id, { owner: event.target.value as BetaFeedbackOwner })}>{feedbackOwners.map((owner) => <option key={owner}>{owner}</option>)}</select></label>
                  <label>Incident<select value={item.incidentState} onChange={(event) => void updateFeedback(item.id, { incidentState: event.target.value as BetaFeedbackIncidentState })}>{feedbackIncidentStates.map((state) => <option key={state}>{state}</option>)}</select></label>
                  <label>Admin notes<textarea value={item.notes || ""} onChange={(event) => setFeedback((current) => current.map((row) => row.id === item.id ? { ...row, notes: event.target.value } : row))} onBlur={(event) => void updateFeedback(item.id, { notes: event.target.value })} placeholder="Triage note for next agent..." /></label>
                  {item.incidentState !== "triggered" ? <button className="ed-link-button beta-incident-button" type="button" onClick={() => void updateFeedback(item.id, { incidentState: "triggered", status: item.status === "new" ? "triaged" : item.status })}><AlertTriangle size={14} />Trigger incident</button> : null}
                </footer>
              </details>
            </article>
          )) : <section className="ed-empty-state is-quiet"><MessageSquareWarning size={24} /><h2>No feedback in this filter</h2><p>Share role invite links with teammates, then reports appear here.</p></section>}
        </div>
      )}
    </section>
  );
}

function IntegrationTable({ rows = [] }: { rows?: IntegrationReadinessItem[] }) {
  return (
    <>
      <div className="ed-mobile-card-list" aria-label="Integration readiness">
        {rows.map((row) => (
          <details className="ed-admin-mobile-detail" key={row.id}>
            <summary><span><strong>{row.label}</strong><small>{row.owner}</small></span><AdminStatusBadge tone={integrationTone(row)} label={integrationState(row)} /></summary>
            <p>{row.detail}</p>
          </details>
        ))}
      </div>
      <table className="ed-table ed-desktop-table">
        <thead><tr>{integrationReadinessColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td>{row.label}</td><td>{row.owner}</td><td><StatusBadge status={integrationState(row)} /></td><td>{row.detail}</td></tr>)}</tbody>
      </table>
    </>
  );
}

function AuditTable({ readiness, onViewAll, compact = false }: { readiness?: DamReadinessResult | null; onViewAll?: () => void; compact?: boolean }) {
  const actorRows = (readiness?.auditLog.recent || []).filter((row) => row.actor).slice(0, 8);
  const storage = readiness?.auditLog.storage;
  return (
    <section className="ed-card">
      <header className="ed-card-head"><h3>Recent Audit Activity</h3>{onViewAll ? <button className="ed-link-button" type="button" onClick={onViewAll}>View all logs</button> : null}</header>
      {storage ? (
        <section className="ed-audit-storage-state" aria-label="Audit storage state">
          <AdminStatusBadge tone={storage.productionReady ? "Healthy" : "Warning"} label={storage.productionReady ? "Durable" : "Local only"} />
          <div>
            <strong>{storage.mode} · {storage.truthBoundary}</strong>
            <p>{storage.detail}</p>
          </div>
        </section>
      ) : null}
      <details className="ed-admin-mobile-detail ed-audit-detail" open={!compact}>
        <summary><span><strong>Audit detail</strong><small>{(readiness?.auditLog.recent || []).length.toLocaleString()} recent events</small></span></summary>
        {actorRows.length ? <div className="ed-beta-audit-proof" aria-label="Actor audit proof">{actorRows.map((row) => <p key={`proof-${row.id}`}><strong>{row.actor}</strong><span>{row.role} · {row.type} · {row.status}</span></p>)}</div> : null}
        <div className="ed-mobile-card-list" aria-label="Recent audit activity">
          {(readiness?.auditLog.recent || []).slice(0, 10).map((row) => (
            <details className="ed-admin-mobile-detail" key={row.id}>
              <summary><span><strong>{row.type}</strong><small>{row.actor || "Unknown"} · {row.role}</small></span><AdminStatusBadge tone={row.status === "denied" || row.status === "blocked" ? "Warning" : row.status === "queued" ? "Info" : "Healthy"} label={row.status} /></summary>
              <p>{row.summary}</p>
              <p><strong>Time:</strong> {row.createdAt}</p>
            </details>
          ))}
        </div>
        <table className="ed-table ed-desktop-table">
          <thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Object</th><th>Summary</th></tr></thead>
          <tbody>{(readiness?.auditLog.recent || []).slice(0, 10).map((row) => <tr key={row.id}><td>{row.createdAt}</td><td>{row.actor || "Unknown"}</td><td>{row.role}</td><td>{row.type}</td><td>{row.assetId || row.resourceSpaceId || "Portal"}</td><td>{row.summary}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

function AdminOperationalReadinessModules({
  readiness,
  onSelectModule
}: {
  readiness?: DamReadinessResult | null;
  onSelectModule: SelectAdminModule;
}) {
  const metrics = readiness?.metrics;
  const modules = [
    {
      label: "Needs Review",
      value: metrics?.needsReview || 0,
      detail: "Review workload before any broader reuse.",
      action: "Review",
      nav: "review-workflows"
    },
    {
      label: "Blocked by Consent",
      value: metrics?.childrenYouth || 0,
      detail: "People/minors and consent-sensitive records.",
      action: "Policies",
      nav: "rights-policies"
    },
    {
      label: "Rights Expiring / Recheck Needed",
      value: metrics?.staleApprovals || 0,
      detail: "Lifecycle/recheck blockers stay ahead of usage metrics.",
      action: "Policies",
      nav: "rights-policies"
    },
    {
      label: "Metadata Gaps",
      value: (metrics?.taxonomyDrift || 0) + (metrics?.aiEnrichment || 0),
      detail: "Required fields, taxonomy drift, and suggestions needing human decision.",
      action: "Metadata",
      nav: "metadata-schemas"
    },
    {
      label: "Source Custody Gaps",
      value: metrics?.missingSource || 0,
      detail: "Source/provenance needs confirmation; no private paths exposed here.",
      action: "Storage",
      nav: "storage-retention"
    },
    {
      label: "Duplicate Links",
      value: metrics?.duplicateCandidates || 0,
      detail: "Canonical/source membership decisions; never auto-delete source appearances.",
      action: "Taxonomy",
      nav: "taxonomy"
    },
    {
      label: "Distribution Blockers",
      value: (readiness?.actionBacklog || []).filter((item) => /package|share|distribution/i.test(`${item.id} ${item.label} ${item.action}`)).reduce((sum, item) => sum + item.count, 0),
      detail: "Distribution set drafts remain blocked by item-level clearance.",
      action: "Review",
      nav: "review-workflows"
    },
    {
      label: "Feedback Inbox",
      value: "Open",
      detail: "Open triage inbox; counts load inside module from feedback storage.",
      action: "Feedback",
      nav: "feedback-inbox"
    },
    {
      label: "Import Audit Coverage",
      value: readiness?.auditLog.count || 0,
      detail: "Actor-backed audit evidence, not production readiness by itself.",
      action: "Audit",
      nav: "audit-logs"
    }
  ];

  return (
    <section className="ed-card ed-admin-module" aria-label="Operational readiness modules">
      <header className="ed-card-head">
        <div>
          <h3>Operational readiness modules</h3>
          <p>Blockers, gaps, and worklists outrank usage metrics. Missing data is not counted as success.</p>
        </div>
        <StatusBadge status="Read-only" />
      </header>
      <div className="ed-module-grid">
        {modules.map((item) => (
          <section className="ed-card ed-module-card" key={item.label}>
            <h3>{item.label}</h3>
            <strong>{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</strong>
            <p>{item.detail}</p>
            <button className="ed-link-button" type="button" onClick={() => onSelectModule(item.nav)}>{item.action}</button>
          </section>
        ))}
      </div>
    </section>
  );
}

function OverviewModule({ readiness, onSelectModule, compact = false }: { readiness?: DamReadinessResult | null; onSelectModule: SelectAdminModule; compact?: boolean }) {
  return (
    <>
      <section className="ed-admin-section" aria-labelledby="launch-readiness-section">
        <header><div><span className="ed-section-eyebrow">Local prototype</span><h3 id="launch-readiness-section" tabIndex={-1}>Blocking evidence</h3></div><p>Exception-first controls before any teammate rehearsal.</p></header>
        <BetaCommandCenter readiness={readiness} compact={compact} />
      </section>
      <details className="ed-admin-section ed-admin-overview-drilldown" open={!compact}>
        <summary>
          <span><span className="ed-section-eyebrow">Governance policies</span><strong id="governance-policies-section" tabIndex={-1}>Access boundaries and custody</strong></span>
          <small>Source truth, policy counts, role boundaries. No writeback.</small>
        </summary>
        <div className="ed-admin-section-body">
          <AdminOperationalReadinessModules readiness={readiness} onSelectModule={onSelectModule} />
          <CustodyMapPanel readiness={readiness} />
          <div className="ed-kpi-grid is-four"><KpiCard label="Records" value={(readiness?.assetCount || 0).toLocaleString()} delta="ResourceSpace-backed" icon={Database} /><KpiCard label="Readiness" value={`${readiness?.score || 0}/100`} delta="policy score" icon={Shield} /><KpiCard label="Needs Review" value={(readiness?.metrics.needsReview || 0).toLocaleString()} delta="queue count" icon={FileText} /><KpiCard label="Audit Events" value={(readiness?.auditLog.count || 0).toLocaleString()} delta="portal log" icon={Box} /></div>
          <div className="ed-module-grid">{(readiness?.actionBacklog || []).slice(0, 6).map((item) => <section className="ed-card ed-module-card" key={item.id}><AdminStatusBadge tone={item.severity === "critical" || item.severity === "high" ? "Critical" : item.severity === "medium" ? "Warning" : "Info"} label={item.severity} /><h3>{item.label}</h3><p>{item.action}</p><small>{item.count.toLocaleString()} · {item.owner}</small></section>)}</div>
        </div>
      </details>
      <details className="ed-admin-section ed-admin-overview-drilldown" open={!compact}>
        <summary>
          <span><span className="ed-section-eyebrow">Audit activity</span><strong id="audit-activity-section" tabIndex={-1}>Recent actor-backed events</strong></span>
          <small>Denied, queued, preview, allowed.</small>
        </summary>
        <div className="ed-admin-section-body">
          <AuditTable readiness={readiness} onViewAll={() => onSelectModule("audit-logs")} compact={compact} />
        </div>
      </details>
      <details className="ed-admin-section ed-admin-overview-drilldown" open={!compact}>
        <summary>
          <span><span className="ed-section-eyebrow">Integration health</span><strong id="system-health-section" tabIndex={-1}>Source and integration state</strong></span>
          <small>Read-only until writeback approval.</small>
        </summary>
        <div className="ed-admin-section-body">
          <section className="ed-card"><header className="ed-card-head"><div><h3>Integration Status</h3><p>ResourceSpace, Drive, S3, and portal readiness.</p></div><SourcePill source={readiness?.source} live={mediaSourceIsLive(readiness?.source)} /></header><IntegrationTable rows={readiness?.integrationReadiness || []} /></section>
        </div>
      </details>
    </>
  );
}

function MetadataSchemaConsole({ readiness }: { readiness?: DamReadinessResult | null }) {
  const health = metadataSchemaHealthSummary();
  const coverageByKey = new Map((readiness?.fieldMappings || []).map((row) => [row.key, row]));

  return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head">
        <div>
          <h3>Metadata Fields</h3>
          <p>Admin-only field governance. ResourceSpace remains metadata truth; Shared Drive remains master custody.</p>
        </div>
        <StatusBadge status="Read-only" />
      </header>
      <div className="ed-admin-stat-grid">
        <article><strong>{health.total}</strong><span>governed fields</span><small>{health.required} required</small></article>
        <article><strong>{health.controlled}</strong><span>controlled fields</span><small>select lists, not free text</small></article>
        <article><strong>{health.privateInternals}</strong><span>private internals</span><small>DAM Admin only</small></article>
      </div>
      <table className="ed-table">
        <thead>
          <tr>
            <th>Field key</th>
            <th>Controlled values</th>
            <th>Required</th>
            <th>Role visibility</th>
            <th>Clearance effect</th>
            <th>Intake</th>
            <th>Source binding</th>
          </tr>
        </thead>
        <tbody>
          {enterpriseMetadataSchemaRows.map((row) => {
            const coverage = coverageByKey.get(row.key);
            return (
              <tr key={row.key}>
                <td><strong>{row.key}</strong><br /><small>{row.label}</small></td>
                <td>{row.controlledValues.length ? row.controlledValues.join(", ") : "Free text / derived"}</td>
                <td>{row.required ? "Required" : "Optional"}</td>
                <td>{row.roleVisibility.join(", ")}</td>
                <td>{row.clearanceEffect}</td>
                <td>{row.intakeRequirement}</td>
                <td><small>{row.sourceTruth}</small><br />{row.resourceSpaceField}<br /><StatusBadge status={coverage && coverage.coverage >= 90 ? "Operational" : row.required ? "Degraded" : "Read-only"} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ed-mobile-card-list" aria-label="Metadata field owner notes">
        {enterpriseMetadataSchemaRows.filter((row) => row.privateSourceInternal || row.required).slice(0, 8).map((row) => (
          <article key={`note-${row.key}`}>
            <header><strong>{row.label}</strong><AdminStatusBadge tone={row.privateSourceInternal ? "Disabled" : "Info"} label={row.privateSourceInternal ? "Admin only" : "Governed"} /></header>
            <p>{row.ownerNotes}</p>
            <span>{row.resourceSpaceField}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function TaxonomyGovernanceConsole({ readiness }: { readiness?: DamReadinessResult | null }) {
  const health = taxonomyHealthSummary();
  const vocabulary = readiness?.vocabulary || [];

  return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head">
        <div>
          <h3>Taxonomy</h3>
          <p>Canonical vocabulary, alias cleanup, forbidden language, and sensitive ministry mappings for reviewer-owned metadata.</p>
        </div>
        <StatusBadge status={readiness?.metrics.taxonomyDrift ? "Degraded" : "Operational"} />
      </header>
      <div className="ed-admin-stat-grid">
        <article><strong>{health.canonicalLabels.length}</strong><span>canonical labels</span><small>{health.aliasCount} aliases</small></article>
        <article><strong>{health.deprecatedTerms.length}</strong><span>deprecated terms</span><small>cleanup candidates</small></article>
        <article><strong>{health.forbiddenTerms.length}</strong><span>forbidden terms</span><small>reviewer-owned policy</small></article>
      </div>
      <table className="ed-table">
        <thead>
          <tr>
            <th>Canonical label</th>
            <th>Aliases</th>
            <th>Deprecated</th>
            <th>Forbidden</th>
            <th>Sensitive / ministry mapping</th>
            <th>Owner notes</th>
          </tr>
        </thead>
        <tbody>
          {taxonomyGovernanceTerms.map((term) => (
            <tr key={term.canonical}>
              <td><strong>{term.canonical}</strong></td>
              <td>{term.aliases.join(", ")}</td>
              <td>{term.deprecatedTerms.join(", ")}</td>
              <td>{term.forbiddenTerms.join(", ")}</td>
              <td><small>{term.ministryMapping}</small><br />{term.sensitiveMapping || "public-safe when evidence supports it"}</td>
              <td>{term.ownerNotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="ed-card">
        <header className="ed-card-head"><div><h3>Observed vocabulary</h3><p>Current ResourceSpace-backed terms remain evidence, not automatic policy changes.</p></div><StatusBadge status="Read-only" /></header>
        <table className="ed-table">
          <thead><tr><th>Term</th><th>Count</th><th>Kind</th></tr></thead>
          <tbody>{vocabulary.slice(0, 12).map((row) => <tr key={`${row.kind}-${row.term}`}><td>{row.term}</td><td>{row.count.toLocaleString()}</td><td>{row.kind}</td></tr>)}</tbody>
        </table>
      </section>
    </section>
  );
}

function AdminModuleContent({ activeNav, readiness, onSelectModule, compact = false }: { activeNav: string; readiness?: DamReadinessResult | null; onSelectModule: SelectAdminModule; compact?: boolean }) {
  const metrics = readiness?.metrics;
  const integrations = readiness?.integrationReadiness || [];
  if (activeNav === "overview") return <OverviewModule readiness={readiness} onSelectModule={onSelectModule} compact={compact} />;
  if (activeNav === "feedback-inbox") return <FeedbackInboxModule compact={compact} />;
  if (activeNav === "users-roles") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Users & Access</h3><p>Identity not production-proven. Demo roles, prototype login, and SSO header mapping do not prove production identity.</p></div><StatusBadge status="Pending setup" /></header>
      <div className="ed-admin-stat-grid">
        <article><strong>4</strong><span>role tiers</span><small>Viewer, Contributor, Reviewer, DAM Admin</small></article>
        <article><strong>Local</strong><span>prototype fallback</span><small>Role switch remains for rehearsal QA only</small></article>
        <article><strong>Not proven</strong><span>production identity</span><small>Needs trusted IdP header proof</small></article>
      </div>
      <TruthMatrixTable rows={identityTruthRows} mode="identity" />
      <table className="ed-table"><thead><tr><th>Role</th><th>Primary job</th><th>Download</th><th>Upload</th><th>Review</th><th>Admin</th></tr></thead><tbody>{roleRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{cell}</td>)}</tr>)}</tbody></table>
    </section>
  );
  if (activeNav === "roles-permissions") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Permission Matrix</h3><p>Frontend labels mirror backend gates; sensitive actions stay server-enforced.</p></div><StatusBadge status="Operational" /></header>
      <table className="ed-table"><thead><tr><th>Role</th><th>Find</th><th>Download</th><th>Upload</th><th>Review write</th><th>Governance</th></tr></thead><tbody>{roleRows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td>Allowed visible assets</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td><td>{row[5]}</td></tr>)}</tbody></table>
    </section>
  );
  if (activeNav === "teams") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Teams & Owners</h3><p>Ownership is shown as pilot operating model, not a live directory.</p></div><StatusBadge status="Read-only" /></header>
      <div className="ed-admin-owner-grid">{teamRows.map(([team, owner, detail]) => <article key={team}><Users size={20} /><strong>{team}</strong><span>{owner}</span><p>{detail}</p></article>)}</div>
    </section>
  );
  if (activeNav === "taxonomy") return (
    <TaxonomyGovernanceConsole readiness={readiness} />
  );
  if (activeNav === "metadata-schemas") return (
    <MetadataSchemaConsole readiness={readiness} />
  );
  if (activeNav === "rights-policies") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Rights Policies</h3><p>Policy blockers from portal reuse and ResourceSpace metadata.</p></div><StatusBadge status={metrics?.rightsReview ? "Degraded" : "Operational"} /></header>
      <div className="ed-admin-stat-grid">{policySummaryRows(readiness).map((row) => <article key={row.label}><strong>{row.value.toLocaleString()}</strong><span>{row.label}</span><small>current catalog</small></article>)}</div>
      <table className="ed-table"><thead><tr><th>Policy</th><th>Blocked</th><th>Detail</th></tr></thead><tbody>{(readiness?.portalPolicy || []).map((row) => <tr key={row.id}><td>{row.label}</td><td>{row.blocked.toLocaleString()}</td><td>{row.detail}</td></tr>)}</tbody></table>
    </section>
  );
  if (activeNav === "review-workflows") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Review Sync</h3><p>Pending review writes queue locally unless live ResourceSpace writeback is fully configured.</p></div><StatusBadge status={integrations.find((row) => row.id === "review-writes") ? integrationState(integrations.find((row) => row.id === "review-writes")!) : "Not configured"} /></header>
      <div className="ed-admin-stat-grid"><article><strong>{(metrics?.needsReview || 0).toLocaleString()}</strong><span>needs review</span><small>queue count</small></article><article><strong>{readiness?.auditLog.queued || 0}</strong><span>queued audit events</span><small>portal log</small></article><article><strong>{readiness?.auditLog.denied || 0}</strong><span>denied actions</span><small>role safety</small></article></div>
      <div className="ed-module-grid">{(readiness?.actionBacklog || []).map((item) => <section className="ed-card ed-module-card" key={item.id}><ClipboardCheck size={22} /><h3>{item.label}</h3><p>{item.action}</p><small>{item.count.toLocaleString()} · {item.owner}</small></section>)}</div>
    </section>
  );
  if (activeNav === "storage-retention") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Storage</h3><p>Durable state missing. Local prototype state is not hosted durability proof, and production writes fail closed where durable storage is required.</p></div><StatusBadge status="Read-only" /></header>
      <div className="ed-admin-stat-grid"><article><strong>2.45 TB</strong><span>used</span><small>display-only pilot metric</small></article><article><strong>{(metrics?.renditionGaps || 0).toLocaleString()}</strong><span>rendition gaps</span><small>approved copy readiness</small></article><article><strong>{(metrics?.missingSource || 0).toLocaleString()}</strong><span>missing source</span><small>custody evidence</small></article></div>
      <TruthMatrixTable rows={storageTruthRows} mode="storage" />
      <IntegrationTable rows={integrations.filter((row) => ["master-originals", "approved-copy-delivery", "metadata-source"].includes(row.id))} />
    </section>
  );
  if (activeNav === "ai-moderation") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>AI Assist</h3><p>AI suggestions are assistive only. Human review and ResourceSpace fields remain truth.</p></div><StatusBadge status="Pending setup" /></header>
      <div className="ed-admin-stat-grid"><article><strong>{(metrics?.aiEnrichment || 0).toLocaleString()}</strong><span>AI enrichment</span><small>candidate queue</small></article><article><strong>{(metrics?.taxonomyDrift || 0).toLocaleString()}</strong><span>taxonomy drift</span><small>human cleanup</small></article><article><strong>{(metrics?.duplicateCandidates || 0).toLocaleString()}</strong><span>duplicates</span><small>review before merge</small></article></div>
    </section>
  );
  if (activeNav === "integrations") return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Integrations</h3><p>Live/read-only/setup states by backend system.</p></div><SourcePill source={readiness?.source} live={mediaSourceIsLive(readiness?.source)} /></header>
      <IntegrationTable rows={integrations} />
    </section>
  );
  if (activeNav === "audit-logs") return <AuditTable readiness={readiness} compact={compact} />;
  return (
    <section className="ed-card ed-admin-module">
      <header className="ed-card-head"><div><h3>Integration Status</h3><p>Configuration status for ResourceSpace, writeback, preview proxy, and audit evidence.</p></div><StatusBadge status={readiness?.source.readOnly ? "Read-only" : "Operational"} /></header>
      <IntegrationTable rows={integrations} />
      <div className="ed-admin-stat-grid"><article><strong>{readiness?.score || 0}/100</strong><span>readiness</span><small>policy score</small></article><article><strong>{readiness?.auditLog.count || 0}</strong><span>audit events</span><small>portal log</small></article><article><strong>{readiness?.source.label || "Unknown"}</strong><span>source mode</span><small>{readiness?.source.detail || "not loaded"}</small></article></div>
    </section>
  );
}

export function EnterpriseAdminPage({ initialModule, adminOnly = false }: { initialModule?: string; adminOnly?: boolean } = {}) {
  const { role, ready } = useDemoRole();
  const pathname = usePathname();
  const [activeNav, setActiveNav] = useState(() => normalizeAdminInitialModule(initialModule));
  const [compactAdmin, setCompactAdmin] = useState(false);
  const admin = useAdminReadiness(role);
  const operatorVerified = false;
  const initialNav = normalizeAdminInitialModule(initialModule);
  const pageIdentity = adminPageIdentityByPath.get(pathname) || {
    title: "Governance",
    subtitle: "Local prototype policies, audit activity, storage honesty, identity proof, and integration health for the DAM workspace."
  };
  const activeModuleTitle = activeNav === initialNav
    ? adminModuleTitleByPath.get(pathname) || adminNavLabel(activeNav)
    : adminNavLabel(activeNav);
  function selectAdminNav(id: string, options: AdminNavSelectionOptions = {}) {
    const nextNav = adminNavIds.has(id) ? id : DEFAULT_ADMIN_NAV;
    const hash = options.hash || adminHashByNav.get(nextNav) || DEFAULT_ADMIN_HASH;
    const focusTargetId = options.focusTargetId || adminFocusTargetByHash.get(hash) || "admin-active-module-title";
    setActiveNav(nextNav);
    replaceAdminHash(hash);
    if (options.scroll !== false) window.setTimeout(() => focusAdminTarget(focusTargetId), 0);
  }

  useEffect(() => {
    function syncFromHash() {
      const hash = readAdminHash();
      if (!hash) {
        setActiveNav(normalizeAdminInitialModule(initialModule));
        return;
      }
      const nextNav = adminNavByHash.get(hash) || DEFAULT_ADMIN_NAV;
      const canonicalHash = hash ? canonicalAdminHash(hash, nextNav) : DEFAULT_ADMIN_HASH;
      const focusTargetId = adminFocusTargetByHash.get(canonicalHash) || "admin-active-module-title";
      setActiveNav(nextNav);
      if (hash !== canonicalHash) replaceAdminHash(canonicalHash);
      if (hash) window.setTimeout(() => focusAdminTarget(focusTargetId), 0);
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [initialModule]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const syncCompactAdmin = () => setCompactAdmin(query.matches);
    syncCompactAdmin();
    query.addEventListener("change", syncCompactAdmin);
    return () => query.removeEventListener("change", syncCompactAdmin);
  }, []);

  if (!ready) return <div className="enterprise-page"><LoadingCard label="Loading control center..." /></div>;
  if (!canAccessRoute(role, pathname)) return <div className="enterprise-page"><section className="ed-card ed-access-block"><Lock size={28} /><h1>Governance requires DAM Admin role</h1><p>DAM governance, policies, user access, integrations, and audit controls are restricted to DAM Admins.</p><Link href={routeWithRole("/library", role)}>Return to Asset Library</Link></section></div>;
  const readiness = admin.data;
  return (
    <div className="enterprise-page enterprise-admin-control">
      <PageHeader title={pageIdentity.title} subtitle={pageIdentity.subtitle} />
      <AdminRiskStrip readiness={readiness} disconnected={Boolean(admin.error)} />
      <section className="ed-admin-mode-banner" aria-label="Admin prototype access boundary">
        <div>
          <AdminStatusBadge tone={operatorVerified ? "Healthy" : "Disabled"} label={operatorVerified ? "Prototype operator" : "Admin observer"} />
          <strong>{operatorVerified ? "Controlled local rehearsal controls available" : "Read-only observer mode"}</strong>
          <p>Local prototype only. Not beta-ready. Hosted proof missing. Config changes, secrets, paid hosting changes, source mutation, public launch, and ResourceSpace writeback stay disabled until operator proof is explicit.</p>
        </div>
        <span>No paid June charge. No public launch claim.</span>
      </section>
      <AdminSourceNotice loading={admin.loading} error={admin.error} />
      <div className="ed-admin-grid">
        <section className="ed-admin-main" aria-labelledby="admin-active-module-title">
          <header className="ed-admin-module-title">
            <div>
              <span className="ed-section-eyebrow">Administration</span>
              <h2 id="admin-active-module-title" tabIndex={-1}>{activeModuleTitle}</h2>
              <p>Route-focused control module. Data is read-only unless a safe portal action explicitly says otherwise.</p>
            </div>
            <AdminStatusBadge tone={admin.error ? "Disabled" : "Info"} label={admin.error ? "Source offline" : "Read-only"} />
          </header>
          {admin.loading ? <LoadingCard /> : <>
            <AdminModuleContent activeNav={activeNav} readiness={readiness} onSelectModule={selectAdminNav} compact={compactAdmin} />
          </>}
        </section>
        <AdminRail readiness={readiness} onSelectModule={selectAdminNav} />
      </div>
    </div>
  );
}
