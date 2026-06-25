"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bell, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, Folder, LockKeyhole, MoreHorizontal, Search, Send, Settings, Share2, ShieldCheck, SlidersHorizontal, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useDemoRole } from "@/components/RoleProvider";
import { routeWithRole } from "@/lib/role-routes";

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
          <button type="button"><SlidersHorizontal size={16} />Filters</button>
          <button type="button"><Folder size={16} />Saved views</button>
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

export function PrototypeBrandKitPage() {
  const colors = [["Deep Navy", "#0A1D2F"], ["Acme Blue", "#2563EB"], ["Teal", "#14B8A6"], ["Coral", "#FF6B6B"], ["Sand", "#F3ECE4"], ["Warm Gray", "#6B7280"], ["Charcoal", "#1F2937"], ["White", "#FFFFFF"]];
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="Acme Corporate Brand Kit" subtitle="Governed by Acme Brand Team / Last updated May 13, 2026 by Taylor Morgan" backHref="/brand-hub" actions={<><MiniButton onClick={() => toast.message("Share disabled in local demo.")}><Share2 size={15} />Share</MiniButton><MiniButton onClick={() => toast.message("Brand kit ZIP creation disabled in local demo.")}><Download size={15} />Download kit</MiniButton><MiniButton primary><MoreHorizontal size={16} /></MiniButton></>} />
      <section className="proto-brand-hero"><div className="proto-brand-logo">ACME</div><Pill>Active</Pill><div className="proto-tabs is-surface">{["Overview", "Assets", "Guidelines", "Templates", "Activity"].map((tab, index) => <button key={tab} className={index === 0 ? "is-active" : ""} type="button">{tab}</button>)}</div></section>
      <section className="proto-brand-overview"><p><strong>The official brand kit for Acme Inc.</strong><span>Everything needed to represent the brand with consistency and impact.</span></p>{[["Created", "Jan 15, 2024"], ["Updated", "May 13, 2026"], ["Version", "3.2"], ["Assets", "287"], ["Usage", "Used in 128 assets / 44%"]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</section>
      <section className="proto-brand-grid">
        <article className="proto-surface-card is-wide"><header><h2>Logos</h2><span>6 assets</span></header><div className="proto-logo-row">{["Primary", "Reverse", "Primary Color", "Mark"].map((logo, index) => <div key={logo} className={index === 1 ? "is-dark" : ""}><strong>{index === 3 ? "AC" : "ACME"}</strong><span>{logo}</span><small>{index === 3 ? "SVG" : "PNG"}</small></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Color palette</h2><span>8 colors</span></header><div className="proto-swatch-grid">{colors.map(([name, hex]) => <div key={name}><i style={{ background: hex }} /><strong>{name}</strong><span>{hex}</span></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Typography</h2><span>3 styles</span></header><div className="proto-type-list">{["Acme Sans / Bold", "Acme Sans / Regular", "Acme Mono / Regular"].map((type) => <div key={type}><b>Aa</b><span>{type}</span></div>)}</div></article>
        <article className="proto-surface-card"><header><h2>Icon set</h2><span>24 icons</span></header><div className="proto-icon-cloud">{Array.from({ length: 18 }).map((_, index) => <ShieldCheck size={18} key={index} />)}</div><button type="button">View all icons <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Approved templates</h2><span>7 templates</span></header><div className="proto-template-row">{["Presentation 16:9", "One-pager A4", "Social Post 1080", "Email Header"].map((item) => <div key={item}><div className="proto-template-thumb" /><span>{item}</span></div>)}</div><button type="button">View all templates <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Key campaign assets</h2><span>12 assets</span></header><div className="proto-campaign-strip">{["is-mountain", "is-product", "is-canyon", "is-architecture"].map((klass) => <div key={klass} className={`proto-photo-tile ${klass}`} />)}</div><button type="button">View all assets <ChevronRight size={15} /></button></article>
        <article className="proto-surface-card"><header><h2>Downloads</h2></header>{["Complete brand kit (ZIP) / 287 MB", "Logos only (ZIP) / 12 MB"].map((item) => <button key={item} type="button" onClick={() => toast.message("Download package disabled in local demo.")}>{item}<Download size={15} /></button>)}</article>
        <article className="proto-surface-card"><header><h2>Usage notes</h2></header>{["Use primary logo on light backgrounds.", "Use reverse logo on dark backgrounds.", "Do not alter colors, proportions, or typography."].map((note) => <p key={note}><Check size={14} />{note}</p>)}</article>
        <article className="proto-surface-card"><header><h2>Brand rules</h2></header><div className="proto-rule-row">{["Use approved assets only", "Do not modify logos", "Follow typography rules"].map((rule) => <div key={rule}><ShieldCheck size={18} /><strong>{rule}</strong></div>)}</div></article>
      </section>
    </section>
  );
}

export function PrototypeAuditCompliancePage() {
  const kpis = [["Assets missing rights", "128", "+12%"], ["Expired assets", "34", "+8%"], ["Expiring links", "47", "+16%"], ["Metadata validation issues", "17", "-8%"], ["Policy violations", "9", "+5%"]];
  const rows = ["Downloaded / Mountain Lake Hero.jpg / Compliant / Success", "Added to collection / Spring Campaign 2024 / Compliant / Success", "Updated metadata / Product Skincare Line.jpg / Compliant / Success", "Shared / Profile Portraits Set.jpg / Warning / Success", "Permission changed / Architecture Curve.jpg / Violation / Blocked", "Deleted / Canyon Light.jpg / Compliant / Success"];
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="Audit Log & Compliance" subtitle="Monitor governance activity, policy adherence, and system changes." actions={<MiniButton onClick={() => toast.message("Audit export disabled in local demo.")}><Download size={15} />Export log</MiniButton>} />
      <section className="proto-kpi-row">{kpis.map(([label, value, trend]) => <article key={label}><ShieldCheck size={18} /><span>{label}</span><strong>{value}</strong><small>{trend} vs last 30 days</small></article>)}</section>
      <section className="proto-audit-layout"><div className="proto-audit-table-card"><div className="proto-filter-grid">{["All users", "All actions", "All severities", "May 7 - May 14, 2026", "More filters"].map((filter) => <button key={filter} type="button">{filter}<ChevronDown size={13} /></button>)}</div><table className="proto-audit-table"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Asset / Collection</th><th>Policy result</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row, index) => { const [action, assetName, result, status] = row.split(" / "); return <tr key={row}><td>May {14 - Math.floor(index / 2)}, 2026<br />{9 - index}:24 AM</td><td>{["Taylor Morgan", "Jordan Kim", "Casey Nguyen", "Riley Anderson", "Alex Rivera", "Taylor Morgan"][index]}</td><td>{action}</td><td><span className="proto-table-thumb" />{assetName}</td><td><Pill tone={result === "Violation" ? "danger" : result === "Warning" ? "review" : "approved"}>{result}</Pill></td><td>{status}</td><td><MoreHorizontal size={15} /></td></tr>; })}</tbody></table></div><aside className="proto-audit-rail"><article><header><h2>Recent incidents</h2><button type="button">View all</button></header>{["Policy violation: Public link", "Access removed", "Expired asset detected", "Validation failure"].map((item, index) => <p key={item}><ShieldCheck size={15} /><span><strong>{item}</strong><small>{index === 0 ? "High" : index < 3 ? "Medium" : "Low"}</small></span></p>)}</article><article><header><h2>Needs attention</h2><button type="button">View all</button></header>{kpis.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</article><article><header><h2>Compliance posture</h2></header><div className="proto-donut"><strong>92%</strong><span>Compliant</span></div><p><span>Compliant</span><strong>92%</strong></p><p><span>Warning</span><strong>6%</strong></p><p><span>Violation</span><strong>2%</strong></p></article></aside></section>
    </section>
  );
}

export function PrototypeDistributionSetsPage() {
  const sets = ["Spring Campaign 2024", "Product Launch Assets", "Partner Media Kit", "Q2 Social Content", "Global Retail Images"];
  return (
    <section className="proto-surface-page">
      <SurfaceTop title="Distribution Sets" subtitle="Create, manage, and track external distribution and sharing." actions={<><MiniButton primary onClick={() => toast.message("Share link creation disabled in local demo.")}><Share2 size={15} />Create share link</MiniButton><MiniButton onClick={() => toast.message("Portal publishing disabled in local demo.")}>Publish portal</MiniButton><MiniButton onClick={() => toast.message("Package download disabled in local demo.")}><Download size={15} />Download package</MiniButton></>} />
      <section className="proto-distribution-layout"><div className="proto-distribution-list"><header><strong>All distribution sets</strong><span>38</span><button type="button">Sort: Last modified <ChevronDown size={13} /></button></header>{sets.map((name, index) => <article key={name} className={index === 0 ? "is-selected" : ""}><div className={`proto-photo-tile ${index === 1 ? "is-portrait" : index === 2 ? "is-product" : index === 3 ? "is-canyon" : "is-mountain"}`} /><div><h2>{name}</h2><p>{index % 2 ? "Published portal" : "Share link"} / Created May {14 - index}, 2026 by {index === 1 ? "Jordan Kim" : "Taylor Morgan"}</p><p><Eye size={14} />{[1284, 752, 1921, 568, 2083][index]} Views <Download size={14} />{[342, 208, 512, 124, 620][index]} Downloads <UserCog size={14} />{[12, 8, 25, 6, 18][index]} Recipients</p></div><aside><span>Expires</span><strong>{["Jun 14, 2026", "Jul 10, 2026", "May 28, 2026", "Jun 5, 2026", "Jul 28, 2026"][index]}</strong><small>in {[14, 40, 27, 35, 58][index]} days</small></aside><MoreHorizontal size={16} /></article>)}</div><aside className="proto-distribution-detail"><div className="proto-photo-tile is-mountain is-hero" /><header><h2>Spring Campaign 2024</h2><Pill>Active</Pill></header><div className="proto-url-row"><span>https://aone.io/s/campaign-spring-2024</span><button type="button" onClick={() => toast.message("Copy disabled in local demo.")}>Copy link</button></div><div className="proto-detail-action-grid">{["Open", "Edit", "Download package", "More"].map((item) => <button key={item} type="button">{item}</button>)}</div><div className="proto-tabs is-surface">{["Overview", "Recipients 12", "Settings", "Activity"].map((tab, index) => <button key={tab} className={index === 0 ? "is-active" : ""} type="button">{tab}</button>)}</div><section className="proto-performance-row">{[["Views", "1,284"], ["Downloads", "342"], ["Recipients", "12"]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>up</small></article>)}</section><DetailRows rows={[["Top asset", "Mountain Lake Hero.jpg / 243 views"], ["Created by", "Taylor Morgan / May 14, 2026"], ["Expires", "Jun 14, 2026 / in 14 days"], ["Access", "Anyone with the link"], ["Watermark", "Enabled"], ["Permissions", "View and download"], ["Brand Kit", "Acme Lifestyle"]]} /><p className="proto-muted">Spring campaign hero and supporting assets for web, social, and digital ads.</p></aside></section>
    </section>
  );
}

export function PrototypeIntegrationsSettingsPage() {
  const cards = [["ResourceSpace Connection", "Connected", "Archive One is connected to ResourceSpace for digital asset and metadata synchronization.", "Environment / https://acme.resourcespace.com", "Manage connection"], ["SSO / Identity Provider", "Connected", "Single sign-on is enabled for your organization via Okta.", "SSO mode / SAML 2.0", "Manage SSO"], ["Storage", "Warning", "Assets are stored in Amazon S3. One bucket is nearing capacity.", "Storage used / 82.4 TB of 100 TB", "Manage storage"], ["Webhook & API Access", "Connected", "Webhooks are configured and API access is enabled.", "API access / Enabled for 6 clients", "Manage webhooks & API"], ["Metadata Sync", "Connected", "Metadata is synchronized between Archive One and connected systems.", "Next sync / May 13, 2026 at 3:28 PM", "Configure sync"], ["Taxonomy Sync", "Needs attention", "Some taxonomies have conflicts that require review.", "Taxonomies / 2 with conflicts", "Review issues"]];
  return <section className="proto-surface-page"><SurfaceTop title="Integrations & Settings" subtitle="Manage system integrations, security, and configuration." actions={<MiniButton onClick={() => toast.message("System status opens in hosted beta only.")}>View system status</MiniButton>} /><section className="proto-settings-grid">{cards.map(([title, status, body, meta, action], index) => <article className="proto-settings-card" key={title}><div className="proto-settings-icon">{index === 0 ? "RS" : index === 1 ? <LockKeyhole size={22} /> : index === 3 ? <Send size={22} /> : <Settings size={22} />}</div><div><h2>{title}</h2><p>{body}</p><DetailRows rows={[meta.split(" / ") as [string, string], ["Last sync", "May 13, 2026 at 2:28 PM"]]} /><button type="button">{action}</button></div><Pill tone={status === "Warning" ? "review" : status === "Needs attention" ? "info" : "approved"}>{status}</Pill><button type="button" aria-label={`More actions for ${title}`}><MoreHorizontal size={15} /></button></article>)}<article className="proto-settings-card is-wide"><div className="proto-settings-icon"><Bell size={22} /></div><div><h2>Notification Settings</h2><p>System and activity notifications are configured for your team.</p></div><DetailRows rows={[["Email notifications", "Enabled for 12 users"], ["Slack notifications", "#archive-one-alerts"], ["Digest frequency", "Daily summary"]]} /><button type="button" aria-label="More notification settings"><MoreHorizontal size={15} /></button></article></section></section>;
}
