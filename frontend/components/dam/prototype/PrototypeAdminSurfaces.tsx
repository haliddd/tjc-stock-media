"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Folder, LockKeyhole, MoreHorizontal, Search, Send, Settings, Share2, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useDemoRole } from "@/components/RoleProvider";
import { routeWithRole } from "@/lib/role-routes";
import type { DemoRole } from "@/lib/types";

function Pill({ children, tone = "approved" }: { children: ReactNode; tone?: "approved" | "review" | "danger" | "info" }) {
  return <span className={`proto-status is-${tone}`}>{children}</span>;
}

function MiniButton({ children, primary = false, onClick }: { children: ReactNode; primary?: boolean; onClick?: () => void }) {
  return <button className={`proto-button is-${primary ? "primary" : "secondary"}`} type="button" onClick={onClick}>{children}</button>;
}

function SurfaceTop({ title, subtitle, actions, backHref }: { title: string; subtitle: string; actions?: ReactNode; backHref?: string }) {
  const { role } = useDemoRole();
  const [query, setQuery] = useState("");
  return (
    <header className="proto-surface-head">
      <div className="proto-surface-search-row">
        <label className="proto-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, tags, collections..." /><kbd>⌘K</kbd></label>
        <div className="proto-surface-toolbar-actions">
          <button type="button" onClick={() => toast.message("Filters are local-demo controls. Use Library for source-backed filtering.")}><SlidersHorizontal size={16} />Filters</button>
          <button type="button" onClick={() => toast.message("Saved views are not durable on this local status surface.")}><Folder size={16} />Saved views</button>
          <label><span>Rights-safe only</span><input type="checkbox" defaultChecked /></label>
        </div>
      </div>
      {backHref ? <Link className="proto-detail-back" href={routeWithRole(backHref, role)}><ChevronLeft size={17} />Back</Link> : null}
      <div className="proto-surface-title-row"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions ? <div className="proto-surface-actions">{actions}</div> : null}</div>
    </header>
  );
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="proto-detail-fact-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

type MatrixRole = "Viewer" | "Contributor" | "Reviewer" | "Brand Manager" | "Legal" | "Admin";
type PermissionKey = "view" | "download" | "upload" | "editMetadata" | "approve" | "shareExternally" | "manageRights" | "manageUsers" | "auditLogs";

const permissionColumns: Array<{ key: PermissionKey; label: string; risky?: boolean }> = [
  { key: "view", label: "View" },
  { key: "download", label: "Download" },
  { key: "upload", label: "Upload" },
  { key: "editMetadata", label: "Edit metadata" },
  { key: "approve", label: "Approve", risky: true },
  { key: "shareExternally", label: "Share externally", risky: true },
  { key: "manageRights", label: "Manage rights", risky: true },
  { key: "manageUsers", label: "Manage users", risky: true },
  { key: "auditLogs", label: "Audit logs" }
];

const roleMatrix: Array<{
  role: MatrixRole;
  executableRole: DemoRole;
  description: string;
  inherits: string;
  permissions: Record<PermissionKey, "allow" | "request" | "deny" | "inherited">;
}> = [
  {
    role: "Viewer",
    executableRole: "Viewer",
    description: "Browse rights-safe assets and request restricted use.",
    inherits: "Base public requester",
    permissions: { view: "allow", download: "request", upload: "deny", editMetadata: "deny", approve: "deny", shareExternally: "request", manageRights: "deny", manageUsers: "deny", auditLogs: "deny" }
  },
  {
    role: "Contributor",
    executableRole: "Contributor",
    description: "Submit media intake and track own requests.",
    inherits: "Viewer plus intake",
    permissions: { view: "allow", download: "request", upload: "allow", editMetadata: "request", approve: "deny", shareExternally: "request", manageRights: "deny", manageUsers: "deny", auditLogs: "deny" }
  },
  {
    role: "Reviewer",
    executableRole: "Reviewer",
    description: "Review metadata, rights, people/youth, and approval evidence.",
    inherits: "Contributor plus review",
    permissions: { view: "allow", download: "inherited", upload: "allow", editMetadata: "allow", approve: "allow", shareExternally: "request", manageRights: "request", manageUsers: "deny", auditLogs: "inherited" }
  },
  {
    role: "Brand Manager",
    executableRole: "Reviewer",
    description: "Govern brand guidance and request approval changes.",
    inherits: "Reviewer preview profile",
    permissions: { view: "allow", download: "inherited", upload: "allow", editMetadata: "allow", approve: "request", shareExternally: "request", manageRights: "request", manageUsers: "deny", auditLogs: "inherited" }
  },
  {
    role: "Legal",
    executableRole: "Reviewer",
    description: "Validate rights, release evidence, and restricted-use decisions.",
    inherits: "Reviewer preview profile",
    permissions: { view: "allow", download: "request", upload: "deny", editMetadata: "request", approve: "request", shareExternally: "deny", manageRights: "allow", manageUsers: "deny", auditLogs: "allow" }
  },
  {
    role: "Admin",
    executableRole: "DAM Admin",
    description: "Manage local DAM configuration and review governance surfaces.",
    inherits: "Reviewer plus admin controls",
    permissions: { view: "allow", download: "inherited", upload: "allow", editMetadata: "allow", approve: "allow", shareExternally: "request", manageRights: "allow", manageUsers: "allow", auditLogs: "allow" }
  }
];

function PermissionCell({ role, column, value }: { role: MatrixRole; column: typeof permissionColumns[number]; value: "allow" | "request" | "deny" | "inherited" }) {
  const warning = column.risky && value === "allow";
  const labels = { allow: "Allowed", request: "Request", deny: "Denied", inherited: "Inherited" };
  return (
    <button
      type="button"
      className={`proto-permission-cell is-${value}${warning ? " is-warning" : ""}`}
      aria-label={`${role} ${column.label}: ${labels[value]}${warning ? " risky permission" : ""}`}
      onClick={() => toast.message(`${role} / ${column.label}: ${labels[value]}. Matrix is read-only local demo; no access grant changed.`)}
    >
      <span>{value === "allow" ? "Y" : value === "request" ? "?" : value === "inherited" ? "I" : "-"}</span>
      {warning ? <small>Risk</small> : null}
    </button>
  );
}

export function PrototypeRolesAccessPage() {
  const [simulatedRole, setSimulatedRole] = useState<MatrixRole>("Viewer");
  const selected = roleMatrix.find((item) => item.role === simulatedRole) || roleMatrix[0];
  const allowed = permissionColumns.filter((column) => selected.permissions[column.key] === "allow").length;
  const gated = permissionColumns.filter((column) => selected.permissions[column.key] === "request" || selected.permissions[column.key] === "inherited").length;
  const risky = permissionColumns.filter((column) => column.risky && selected.permissions[column.key] === "allow").length;
  return (
    <section className="proto-surface-page">
      <SurfaceTop
        title="Roles & Access"
        subtitle="Simulate TJC DAM role affordances without granting real permissions or changing ResourceSpace."
        actions={<MiniButton onClick={() => toast.message("Access changes are disabled in local demo. Configure real permissions only after hosted beta identity is decided.")}><LockKeyhole size={15} />Read-only matrix</MiniButton>}
      />
      <section className="proto-role-admin-layout">
        <div className="proto-role-matrix-card">
          <header>
            <div><h2>Permissions matrix</h2><p>Keyboard-navigable controls show policy state. They do not mutate access.</p></div>
            <Pill tone="review">Local simulation</Pill>
          </header>
          <div className="proto-permission-matrix" role="table" aria-label="Role permissions matrix">
            <div className="proto-permission-head" role="row">
              <span role="columnheader">Role</span>
              {permissionColumns.map((column) => <span key={column.key} role="columnheader">{column.label}</span>)}
            </div>
            {roleMatrix.map((row) => (
              <div className={`proto-permission-row${row.role === simulatedRole ? " is-selected" : ""}`} role="row" key={row.role}>
                <button type="button" className="proto-role-name-cell" onClick={() => setSimulatedRole(row.role)}>
                  <strong>{row.role}</strong>
                  <small>{row.inherits}</small>
                </button>
                {permissionColumns.map((column) => <PermissionCell key={column.key} role={row.role} column={column} value={row.permissions[column.key]} />)}
              </div>
            ))}
          </div>
        </div>
        <aside className="proto-role-simulator">
          <header>
            <span>Simulate role view</span>
            <strong>{selected.role}</strong>
            <p>{selected.description}</p>
          </header>
          <div className="proto-role-segmented" role="tablist" aria-label="Simulated role">
            {roleMatrix.map((row) => (
              <button key={row.role} type="button" className={row.role === simulatedRole ? "is-active" : ""} onClick={() => setSimulatedRole(row.role)}>
                {row.role}
              </button>
            ))}
          </div>
          <section className="proto-role-summary-grid">
            <article><span>Allowed</span><strong>{allowed}</strong><small>visible actions</small></article>
            <article><span>Gated</span><strong>{gated}</strong><small>request/inherited</small></article>
            <article><span>Risky</span><strong>{risky}</strong><small>warning states</small></article>
          </section>
          <div className="proto-role-affordance-list">
            {[
              ["Library", "Browse visible assets", routeWithRole("/library", selected.executableRole)],
              ["Upload", selected.executableRole === "Viewer" ? "Hidden; request media instead" : "Contributor intake visible", routeWithRole(selected.executableRole === "Viewer" ? "/requests" : "/upload", selected.executableRole)],
              ["Review", selected.executableRole === "Viewer" || selected.executableRole === "Contributor" ? "Hidden until reviewer role" : "Review workbench visible", routeWithRole("/review", selected.executableRole)],
              ["Admin", selected.executableRole === "DAM Admin" ? "Admin surfaces visible" : "Admin controls hidden", routeWithRole(selected.executableRole === "DAM Admin" ? "/admin/roles" : "/library", selected.executableRole)]
            ].map(([label, detail, href]) => (
              <Link key={label} href={href}>
                <span>{label}</span>
                <strong>{detail}</strong>
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
          <div className="proto-role-warning">
            <ShieldCheck size={18} />
            <p><strong>No fake grants.</strong><span>Simulation only changes preview links and visible affordance copy. Real permissions still come from trusted role/session gates.</span></p>
          </div>
          <div className="proto-role-empty-state">
            <strong>Permission denied state</strong>
            <span>Non-admin roles see Library/Requests instead of this matrix. Access changes require hosted beta identity and ResourceSpace mapping.</span>
          </div>
          <div className="proto-role-state-grid" aria-label="Role state coverage">
            {[
              ["Empty", "No role assignments loaded"],
              ["Loading", "Role policy hydration"],
              ["Error", "Identity mapping unavailable"],
              ["Permission denied", "Non-admin route fallback"]
            ].map(([label, detail]) => <p key={label}><strong>{label}</strong><span>{detail}</span></p>)}
          </div>
        </aside>
      </section>
    </section>
  );
}

export function PrototypeBrandKitPage() {
  const colors = [["Warm Canvas", "#F7F6F2"], ["Sabbath Green", "#2F6B34"], ["Alert Amber", "#A86A13"], ["Review Red", "#9F3A38"], ["Soft Blue", "#DDEAF7"], ["Warm Gray", "#716B62"], ["Near Black", "#151514"], ["White", "#FFFFFF"]];
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="TJC Media Guidance Kit" subtitle="Governed by Media Team / local demo guidance, not source approval truth" backHref="/brand-hub" actions={<><MiniButton onClick={() => toast.message("Share disabled in local demo.")}><Share2 size={15} />Share</MiniButton><MiniButton onClick={() => toast.message("Brand kit ZIP creation disabled in local demo.")}><Download size={15} />Download kit</MiniButton><MiniButton primary><MoreHorizontal size={16} /></MiniButton></>} />
      <section className="proto-brand-hero"><div className="proto-brand-logo">TJC</div><Pill>Active</Pill><div className="proto-tabs is-surface">{["Overview", "Assets", "Guidelines", "Templates", "Activity"].map((tab, index) => <button key={tab} className={index === 0 ? "is-active" : ""} type="button">{tab}</button>)}</div></section>
      <section className="proto-brand-overview"><p><strong>Media guidance for TJC ministry assets.</strong><span>Use approved records, preserve worship context, and keep rights review visible before reuse.</span></p>{[["Created", "Local demo"], ["Updated", "Jun 25, 2026"], ["Version", "Draft"], ["Assets", "Role-visible"], ["Usage", "Reviewer governed"]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</section>
      <section className="proto-brand-grid">
        <article className="proto-surface-card is-wide"><header><h2>Logos</h2><span>Guidance</span></header><div className="proto-logo-row">{["Primary", "Reverse", "Primary Color", "Mark"].map((logo, index) => <div key={logo} className={index === 1 ? "is-dark" : ""}><strong>{index === 3 ? "T" : "TJC"}</strong><span>{logo}</span><small>{index === 3 ? "Mark" : "Guidance"}</small></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Color palette</h2><span>8 colors</span></header><div className="proto-swatch-grid">{colors.map(([name, hex]) => <div key={name}><i style={{ background: hex }} /><strong>{name}</strong><span>{hex}</span></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Typography</h2><span>3 styles</span></header><div className="proto-type-list">{["System Sans / Bold", "System Sans / Regular", "Readable UI Mono"].map((type) => <div key={type}><b>Aa</b><span>{type}</span></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Icon set</h2><span>Policy icons</span></header><div className="proto-icon-cloud">{Array.from({ length: 18 }).map((_, index) => <ShieldCheck size={18} key={index} />)}</div><button type="button">View all icons <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Approved templates</h2><span>Local demo</span></header><div className="proto-template-row">{["Worship slides", "Event notice", "Newsletter image", "Teaching handout"].map((item) => <div key={item}><div className="proto-template-thumb" /><span>{item}</span></div>)}</div><button type="button">View all templates <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Key ministry assets</h2><span>Role-visible</span></header><div className="proto-campaign-strip">{["is-mountain", "is-portrait", "is-canyon", "is-architecture"].map((klass) => <div key={klass} className={`proto-photo-tile ${klass}`} />)}</div><button type="button">View all assets <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Downloads</h2></header>{["Guidance packet (PDF) / local demo disabled", "Logo package / not connected"].map((item) => <button key={item} type="button" onClick={() => toast.message("Download package disabled in local demo.")}>{item}<Download size={15} /></button>)}</article>
        <article className="proto-surface-card"><header><h2>Usage notes</h2></header>{["Use approved media records only.", "Do not alter worship or ministry context.", "Confirm rights, people, and youth visibility before public use."].map((note) => <p key={note}><Check size={14} />{note}</p>)}</article>
        <article className="proto-surface-card"><header><h2>Brand rules</h2></header><div className="proto-rule-row">{["Use approved assets only", "Preserve church context", "Follow reviewer guidance"].map((rule) => <div key={rule}><ShieldCheck size={18} /><strong>{rule}</strong></div>)}</div></article>
      </section>
    </section>
  );
}

export function PrototypeAuditCompliancePage() {
  const kpis = [
    ["Assets missing rights", "128", "local queue count"],
    ["Expired reviews", "34", "local queue count"],
    ["Expiring links", "0", "no public links created"],
    ["Metadata validation issues", "17", "local validation count"],
    ["Policy violations", "9", "blocked local events"]
  ];
  const rows = ["Approved-copy gate checked / Bible Teaching Background.jpg / Compliant / Logged", "Added to collection / Sabbath Service Media / Compliant / Success", "Updated metadata / Fellowship Review Photo.jpg / Warning / Success", "Requested review / Youth Service Upload / Warning / Assigned", "Permission changed / Internal Teaching Handout.jpg / Violation / Blocked", "Archived / Choir Hymn Archive Audio.mp3 / Compliant / Success"];
  const remediationActions = [
    ["Request rights", "Rights request opened locally. Rights Reviewer must verify source evidence before public use."],
    ["Revoke link", "No public link exists in local demo; revoke action remains logged as blocked."],
    ["Assign metadata fix", "Metadata fix assigned locally to Media Team. ResourceSpace writeback remains pending mapping."],
    ["Escalate violation", "Violation escalated locally for ministry/risk follow-up. No approval state changed."],
    ["Review expiring links", "Expiring-link warning routed to local remediation queue. No public link was created."]
  ];
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="Audit Log & Compliance" subtitle="Monitor governance activity, policy adherence, and system changes." actions={<MiniButton onClick={() => toast.message("Audit export disabled in local demo.")}><Download size={15} />Export log</MiniButton>} />
      <section className="proto-kpi-row">{kpis.map(([label, value, detail]) => <article key={label}><ShieldCheck size={18} /><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section>
      <section className="proto-audit-layout"><div className="proto-audit-table-card"><div className="proto-filter-grid">{["All users", "All actions", "All severities", "Jun 1 - Jun 25, 2026", "More filters"].map((filter) => <button key={filter} type="button" onClick={() => toast.message(`${filter} filter is local-demo only; no audit export was changed.`)}>{filter}<ChevronDown size={13} /></button>)}</div><table className="proto-audit-table"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Asset / Collection</th><th>Policy result</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row, index) => { const [action, assetName, result, status] = row.split(" / "); return <tr key={row}><td>Jun {25 - Math.floor(index / 2)}, 2026<br />{9 - index}:24 AM</td><td>{["Media Team", "Rights Reviewer", "Ministry Reviewer", "Contributor", "DAM Admin", "Media Team"][index]}</td><td>{action}</td><td><span className="proto-table-thumb" />{assetName}</td><td><Pill tone={result === "Violation" ? "danger" : result === "Warning" ? "review" : "approved"}>{result}</Pill></td><td>{status}</td><td><button type="button" aria-label={`Open remediation for ${assetName}`} onClick={() => toast.message(`${result} remediation opened locally for ${assetName}. No ResourceSpace writeback occurred.`)}><MoreHorizontal size={15} /></button></td></tr>; })}</tbody></table><section className="proto-remediation-actions" aria-label="Quick remediation actions"><header><h2>Quick remediation</h2><span>Local queue only</span></header>{remediationActions.map(([label, message]) => <button key={label} type="button" onClick={() => toast.message(message)}>{label}</button>)}</section></div><aside className="proto-audit-rail"><article><header><h2>Recent incidents</h2><button type="button" onClick={() => toast.message("Incident detail remains local-demo only.")}>View all</button></header>{["Blocked public link attempt", "Access removed", "Expired review detected", "Validation failure"].map((item, index) => <p key={item}><ShieldCheck size={15} /><span><strong>{item}</strong><small>{index === 0 ? "High" : index < 3 ? "Medium" : "Low"}</small></span></p>)}</article><article><header><h2>Needs attention</h2><button type="button" onClick={() => toast.message("Remediation queue opens from Review and Requests in this local demo.")}>View all</button></header>{kpis.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</article><article><header><h2>Compliance posture</h2></header><div className="proto-donut"><strong>Local</strong><span>Demo</span></div><p><span>Compliant</span><strong>Source-backed</strong></p><p><span>Warning</span><strong>Needs review</strong></p><p><span>Violation</span><strong>Blocked</strong></p></article></aside></section>
    </section>
  );
}

export function PrototypeDistributionSetsPage() {
  const sets = ["Sabbath Service Media", "Youth Service Review", "Public Website Approved", "Internal Ministry Package", "Teaching & Study Portal"];
  const [shareFlowOpen, setShareFlowOpen] = useState(false);
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="Distribution Sets" subtitle="Create, manage, and track external distribution and sharing." actions={<><MiniButton primary onClick={() => setShareFlowOpen((open) => !open)}><Share2 size={15} />Create share link</MiniButton><MiniButton onClick={() => toast.message("Portal publishing disabled in local demo.")}>Publish portal</MiniButton><MiniButton onClick={() => toast.message("Package download disabled in local demo.")}><Download size={15} />Download package</MiniButton></>} />
      {shareFlowOpen ? (
        <section className="proto-share-flow" aria-label="Create share link flow">
          <header>
            <div><h2>Create share link</h2><p>Local preview only. No public URL is created and no recipients are notified.</p></div>
            <Pill tone="review">Draft</Pill>
          </header>
          <div className="proto-share-flow-grid">
            {[
              ["Access", "Private review link"],
              ["Expiration", "7 days / reviewer can shorten"],
              ["Watermark", "Required until approved-copy gate passes"],
              ["Password", "Required for external recipients"],
              ["Recipients", "Media Team, Ministry Reviewer"],
              ["Audit", "Request logged locally only"]
            ].map(([label, value]) => (
              <label key={label}>
                <span>{label}</span>
                <input readOnly value={value} />
              </label>
            ))}
          </div>
          <div className="proto-share-flow-actions">
            <button type="button" onClick={() => toast.message("Share link remains draft-only in local demo. No public URL was created.")}>Save draft</button>
            <button type="button" onClick={() => toast.message("Readiness blocked: item-level rights and recipient delivery still require review.")}>Check readiness</button>
            <button type="button" onClick={() => setShareFlowOpen(false)}>Close</button>
          </div>
        </section>
      ) : null}
      <section className="proto-distribution-layout"><div className="proto-distribution-list"><header><strong>All distribution sets</strong><span>5</span><button type="button" onClick={() => toast.message("Sort changed locally; no published portal was modified.")}>Sort: Last modified <ChevronDown size={13} /></button></header>{sets.map((name, index) => <article key={name} className={index === 0 ? "is-selected" : ""}><div className={`proto-photo-tile ${index === 1 ? "is-portrait" : index === 2 ? "is-peaks" : index === 3 ? "is-canyon" : "is-mountain"}`} /><div><h2>{name}</h2><p>{index % 2 ? "Published portal draft" : "Share package draft"} / Created Jun {25 - index}, 2026 by {index === 1 ? "Ministry Reviewer" : "Media Team"}</p><p><Eye size={14} />{[128, 75, 192, 56, 208][index]} local opens <Download size={14} />{[0, 0, 12, 0, 6][index]} allowed-copy checks <UserCog size={14} />{[4, 3, 8, 2, 5][index]} requesters</p></div><aside><span>Expires</span><strong>{["Not published", "Pending review", "Jul 25, 2026", "Local draft", "Aug 10, 2026"][index]}</strong><small>{["no public link", "rights gated", "30 days", "draft only", "46 days"][index]}</small></aside><MoreHorizontal size={16} /></article>)}</div><aside className="proto-distribution-detail"><div className="proto-photo-tile is-mountain is-hero" /><header><h2>Sabbath Service Media</h2><Pill tone="review">Draft</Pill></header><div className="proto-url-row"><span>Local demo: no public share URL created</span><button type="button" onClick={() => toast.message("No public URL exists in local demo.")}>Copy link</button></div><div className="proto-detail-action-grid">{[
        ["Open", "Open stays in this local detail panel; no public portal was launched."],
        ["Edit", "Distribution editing is blocked until ResourceSpace mapping is confirmed."],
        ["Check readiness", "Readiness checked locally: item-level rights gates still block publishing."],
        ["More", "More actions are local-demo only."]
      ].map(([item, message]) => <button key={item} type="button" onClick={() => toast.message(message)}>{item}</button>)}</div><div className="proto-tabs is-surface">{["Overview", "Requesters 4", "Settings", "Activity"].map((tab, index) => <button key={tab} className={index === 0 ? "is-active" : ""} type="button" onClick={() => toast.message(`${tab} tab preview only; distribution truth stays local-demo.`)}>{tab}</button>)}</div><section className="proto-performance-row">{[["Local opens", "128"], ["Downloads enabled", "0"], ["Requesters", "4"]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>local demo</small></article>)}</section><DetailRows rows={[["Top asset", "Bible Teaching Background.jpg / 24 local opens"], ["Created by", "Media Team / Jun 25, 2026"], ["Expires", "Not published"], ["Access", "No public link in local demo"], ["Watermark", "Pending ResourceSpace mapping"], ["Permissions", "Viewer request, reviewer approves"], ["Brand Kit", "TJC Media Guidance"]]} /><p className="proto-muted">Sabbath service media package. Item-level rights gates still apply; no ResourceSpace writeback occurs from this screen.</p></aside></section>
    </section>
  );
}

export function PrototypeIntegrationsSettingsPage() {
  const cards = [["ResourceSpace Connection", "Needs attention", "The portal can read local/exported ResourceSpace metadata. Approval writeback remains disabled until field mapping is confirmed.", "Environment / Local beta or configured ResourceSpace export", "Review mapping"], ["SSO / Identity Provider", "Local demo", "Trusted headers are supported for beta testing. No production identity provider is claimed here.", "SSO mode / Pending hosted beta decision", "Review access"], ["Storage", "Local demo", "Source media remains in Google Shared Drive and ResourceSpace custody. This app does not store originals.", "Storage used / Not measured by portal", "View custody rules"], ["Webhook & API Access", "Pending", "API/webhook delivery is not enabled in this local demo. External automation stays off.", "API access / Pending", "Review API plan"], ["Metadata Sync", "Read-only", "Metadata is read from current source adapters. Writes require ResourceSpace mapping and reviewer confirmation.", "Next sync / Manual local refresh", "Configure sync"], ["Taxonomy Sync", "Needs attention", "Suggested tags need human review before they become governed metadata.", "Taxonomies / local demo conflicts possible", "Review issues"]];
  return <section className="proto-surface-page"><SurfaceTop title="Integrations & Settings" subtitle="Manage ResourceSpace status, security posture, and local demo boundaries." actions={<MiniButton onClick={() => toast.message("System status is local-only in this environment.")}>View system status</MiniButton>} /><section className="proto-settings-grid">{cards.map(([title, status, body, meta, action], index) => <article className="proto-settings-card" key={title}><div className="proto-settings-icon">{index === 0 ? "RS" : index === 1 ? <LockKeyhole size={22} /> : index === 3 ? <Send size={22} /> : <Settings size={22} />}</div><div><h2>{title}</h2><p>{body}</p><DetailRows rows={[meta.split(" / ") as [string, string], ["Last check", "Jun 25, 2026 local"]]} /><button type="button" onClick={() => toast.message(`${action} is local-demo only; no external integration was changed.`)}>{action}</button></div><Pill tone={status === "Needs attention" ? "review" : status === "Pending" ? "info" : "approved"}>{status}</Pill><button type="button" aria-label={`More actions for ${title}`} onClick={() => toast.message(`${title} more actions are disabled in local demo.`)}><MoreHorizontal size={15} /></button></article>)}<article className="proto-settings-card is-wide"><div className="proto-settings-icon"><Bell size={22} /></div><div><h2>Notification Settings</h2><p>Local demo notifications show in-app only. Email/chat delivery is not configured.</p></div><DetailRows rows={[["Email notifications", "Not configured"], ["Team channel", "Pending integration"], ["Digest frequency", "Local UI only"]]} /><button type="button" aria-label="More notification settings" onClick={() => toast.message("Notification delivery settings are not writable in local demo.")}><MoreHorizontal size={15} /></button></article></section></section>;
}
