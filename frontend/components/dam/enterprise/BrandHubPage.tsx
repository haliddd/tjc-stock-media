"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, FileText, MoreHorizontal, PackageCheck, Share2, ShieldAlert, Star } from "lucide-react";
import { useDemoRole } from "@/components/RoleProvider";
import { useBrandKit } from "@/components/dam/useDamApi";
import { assetRecordRef, displayTitle, recordIdLabel, sourceLabel, sourceNoun } from "@/lib/enterprise-display";
import { presentBrandKitContext } from "@/lib/portal-context-presenters";
import { routeWithRole } from "@/lib/role-routes";
import { ActionButton, AssetThumb, IconButton, LoadingCard, SourcePill } from "./EnterpriseShared";

const brandSections = [
  { id: "brand-overview", label: "Overview" },
  { id: "brand-usage", label: "How to use" },
  { id: "brand-messages", label: "Messages" },
  { id: "brand-logo", label: "Logo" },
  { id: "brand-downloads", label: "Downloads" },
  { id: "brand-channels", label: "Channels" }
];

export function EnterpriseBrandHubPage() {
  const { role } = useDemoRole();
  const brandKit = useBrandKit("mvp-2024", role);
  const [section, setSection] = useState(brandSections[0].label);
  const [invite, setInvite] = useState("");
  const [sentInvite, setSentInvite] = useState("");
  const [kitMessage, setKitMessage] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const kit = brandKit.data?.kit;
  const principles = kit?.principles?.length ? kit.principles : [];
  const keyMessages = kit?.keyMessages?.length ? kit.keyMessages : [];
  const logoUsage = kit?.logoUsage?.length ? kit.logoUsage : [];
  const kitAssets = brandKit.data?.assets || [];
  const governance = brandKit.data?.governance;
  const connected = Boolean(kit?.configured);
  const noun = sourceNoun(brandKit.source);
  const recordLabel = recordIdLabel(brandKit.source);
  const readyScore = governance?.totalAssets ? Math.round((governance.portalReadyAssets / governance.totalAssets) * 100) : 0;
  const shareDisabledReason = governance?.canShare ? undefined : governance?.summary || "Share waits for configured Brand Kit assets that pass current role policy.";
  const downloadDisabledReason = governance?.canDownloadKit ? undefined : governance?.summary || "Download disabled until this kit is connected to a ResourceSpace collection.";
  const nextSafeAction = presentBrandKitContext(governance, role, connected);
  const configureCollection = () => {
    setSetupOpen(true);
    setMoreOpen(false);
    setKitMessage(role === "DAM Admin"
      ? `Set ${kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"} in server environment, then reload Brand Hub.`
      : "Ask a DAM Admin to configure the ResourceSpace collection mapping.");
  };
  const focusShare = () => {
    document.getElementById("brand-kit-share")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setKitMessage(governance?.deliveryReady ? "Readiness packet is role-safe. Invite delivery remains disabled in beta." : "Share waits for configured Brand Kit assets that pass current role policy.");
  };
  return (
    <div className="enterprise-page enterprise-brand">
      <div className="ed-brand-top"><div className="ed-breadcrumb">Brand Hub <span>›</span> Ministry Kits <span>›</span> MVP 2024</div><div><ActionButton icon={Star} onClick={() => setKitMessage("MVP 2024 saved to this beta session.")}>Save</ActionButton><ActionButton icon={Share2} disabled={Boolean(governance && !governance.canShare)} disabledReason={shareDisabledReason} onClick={focusShare}>Share Kit</ActionButton><ActionButton tone="dark" icon={Download} disabled={Boolean(governance && !governance.canDownloadKit)} disabledReason={downloadDisabledReason} onClick={() => setKitMessage(governance?.deliveryReady ? "Kit readiness packet is ready. ZIP export remains disabled in beta." : downloadDisabledReason || "Download disabled.")}>Download Kit</ActionButton><div className="ed-action-menu-wrap"><IconButton label="More" onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={16} /></IconButton>{moreOpen ? <div className="ed-more-actions-menu ed-brand-more" role="menu"><button type="button" onClick={configureCollection}>View setup details<span>{role === "DAM Admin" ? "Show server env key and collection status." : "Admin-only ResourceSpace setup."}</span></button><button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setKitMessage("Kit link copied."); setMoreOpen(false); }}>Copy kit link<span>Copies this Brand Hub URL.</span></button><a href={routeWithRole("/guide", role)} onClick={() => setMoreOpen(false)}>Open help guide<span>Role-safe DAM guidance.</span></a></div> : null}</div></div></div>
      {kitMessage ? <p className="ed-inline-success ed-brand-status">{kitMessage}</p> : null}
      <div className="ed-brand-layout">
        <main className="ed-brand-main">
          <nav className="ed-panel ed-brand-nav" aria-label="Brand kit sections">
            {brandSections.map((item) => (
              <a
                className={section === item.label ? "is-active" : ""}
                href={`#${item.id}`}
                key={item.id}
                onClick={() => setSection(item.label)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <section id="brand-overview" className="ed-brand-hero"><div><span>MINISTRY KIT</span><h1>{kit?.title || "MVP 2024"} <em>{connected ? "Connected" : "Setup needed"}</em></h1><p>Editorial guidance can be curated here, but downloadable media must resolve to {noun} records or collections.</p><dl><div><dt>Owner</dt><dd>{kit?.owner || "Brand Team"}</dd></div><div><dt>Data source</dt><dd>{sourceLabel(brandKit.source)}</dd></div><div><dt>Next step</dt><dd>{connected ? "Review mapped assets" : "Connect collection"}</dd></div></dl></div></section>
          {brandKit.loading ? <LoadingCard label="Loading Brand Kit mapping..." /> : null}
          {!brandKit.loading && !connected ? <section className="ed-card ed-empty-state"><Database size={24} /><h2>Connect this kit to a {noun} collection</h2><p>{role === "DAM Admin" ? <>Set <strong>{kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"}</strong> before showing downloadable kit files.</> : "Ask a DAM Admin to connect the kit mapping before showing downloadable files."} Fake ZIP downloads are disabled.</p><ActionButton onClick={configureCollection}>{role === "DAM Admin" ? "View setup details" : "Ask DAM Admin"}</ActionButton></section> : null}
          {setupOpen ? <section className="ed-card ed-setup-note"><strong>{role === "DAM Admin" ? "ResourceSpace collection setup" : "Admin setup required"}</strong><p>{role === "DAM Admin" ? `Server env key: ${kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"}. Current collection: ${kit?.resourceSpaceCollectionId || "not configured"}. This panel does not write to ResourceSpace.` : "Viewer and Contributor roles do not see ResourceSpace operations details. Ask a DAM Admin to connect this kit."}</p></section> : null}
          {brandKit.data?.collectionStatus && !brandKit.data.collectionStatus.ok ? <section className="ed-card ed-setup-note"><strong>Collection read blocked</strong><p>{brandKit.data.collectionStatus.message}</p></section> : null}
          {(brandKit.data?.warnings || []).length ? <section className="ed-card ed-setup-note"><strong>Setup warnings</strong>{brandKit.data?.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}
          {governance ? <section className="ed-card ed-brand-governance"><header className="ed-card-head"><h3>Kit readiness</h3><span>{governance.portalReadyAssets}/{governance.totalAssets} Portal Ready</span></header><div className="ed-brand-readiness"><div><strong>{readyScore}%</strong><span>delivery ready</span></div><div className="ed-readiness-meter" aria-label={`Brand kit readiness ${readyScore}%`}><span style={{ width: `${readyScore}%` }} /></div><p>{governance.summary}</p></div><div className={`ed-brand-next-action is-${nextSafeAction.tone}`}><PackageCheck size={18} /><div><strong>{nextSafeAction.nextTitle}</strong><span>{nextSafeAction.nextDetail}</span></div><button type="button" onClick={nextSafeAction.tone === "blocked" ? configureCollection : governance.deliveryReady ? () => setKitMessage("Role-safe readiness packet prepared. No ZIP, public link, source copy, or invite delivery was created.") : () => setKitMessage(`Delivery still blocked: ${governance.blockers.slice(0, 3).join(" ")}`)}>{nextSafeAction.nextAction}</button></div><div className="ed-brand-proof-grid"><span><strong>{governance.portalReadyAssets}</strong><small>Portal Ready</small></span><span><strong>{governance.internalOnlyAssets}</strong><small>Internal only</small></span><span><strong>{governance.reviewRequiredAssets}</strong><small>Need review</small></span><span><strong>{governance.missingSectionMappings}</strong><small>Missing sections</small></span></div><div className="ed-command-readiness">{governance.commands.map((item) => <p className={`is-${item.status}`} key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></p>)}</div>{governance.readinessPacket.manifests[0] ? <div className="ed-command-readiness">{governance.readinessPacket.manifests[0].items.map((item) => <p className={`is-${item.status === "ready" ? "ready" : item.status === "request-only" ? "review" : "blocked"}`} key={item.id}><strong>{item.label}</strong><span>{item.detail}</span></p>)}</div> : null}{governance.blockers.length ? <div className="ed-brand-blockers">{governance.blockers.slice(0, 4).map((blocker) => <p key={blocker}><AlertTriangle size={14} />{blocker}</p>)}</div> : <p className="ed-inline-success"><CheckCircle2 size={14} />No kit readiness blockers for current role. Beta delivery remains disabled.</p>}</section> : <section className="ed-card ed-brand-governance"><header className="ed-card-head"><h3>Kit readiness</h3><span>Waiting for mapping</span></header><p><ShieldAlert size={14} />Brand Hub never creates fake kit downloads. Connect a DAM-backed collection before delivery actions unlock.</p></section>}
          <section id="brand-usage" className="ed-card ed-brand-section"><h3>How to use these assets</h3><p>Use approved derivatives for ministry communications. Source files, alternate crops, and external/public uses should be checked through DAM review when scope is unclear.</p><div className="ed-principle-grid">{principles.map((principle) => <article key={principle.title}><CheckCircle2 size={20} /><strong>{principle.title}</strong><p>{principle.description}</p></article>)}</div></section>
          <section id="brand-logo" className="ed-card ed-brand-section"><header className="ed-card-head"><h3>Logo usage</h3><a href="#brand-downloads" onClick={() => setSection("Downloads")}>View mapped logo assets →</a></header><div className="ed-logo-grid">{logoUsage.map((item) => <article key={item.title} className={item.discouraged ? "is-wrong" : ""}><div><img src={item.variant === "reverse" ? "/brand/tjc-logo-english-white.png" : "/brand/tjc-logo-english-color.png"} alt="True Jesus Church logo" /></div><strong>{item.title}</strong><small>{item.guidance}</small></article>)}</div></section>
          <div className="ed-two-col">
            <section id="brand-messages" className="ed-card ed-brand-section"><h3>Key messages</h3>{keyMessages.map((item) => <p className="ed-checkline" key={item}><CheckCircle2 size={16} />{item}</p>)}</section>
            <section id="brand-downloads" className="ed-card ed-brand-section"><header className="ed-card-head"><h3>{noun} kit assets</h3><SourcePill source={brandKit.source} live={brandKit.live} /></header><div className="ed-photo-row">{kitAssets.slice(0, 4).map((asset) => <AssetThumb asset={asset} key={asset.id} />)}</div><p>{kitAssets.length ? `Assets matched configured ResourceSpace collection/source membership.` : "No mapped collection assets yet."}</p></section>
          </div>
          <section id="brand-channels" className="ed-card ed-brand-section"><h3>Allowed channels</h3><div className="ed-principle-grid"><article><CheckCircle2 size={20} /><strong>Church web and app</strong><p>Use approved derivatives and keep captions reverent, accurate, and current.</p></article><article><CheckCircle2 size={20} /><strong>Social and announcements</strong><p>Confirm public scope, consent, and youth visibility before publishing.</p></article><article><CheckCircle2 size={20} /><strong>Print and slides</strong><p>Prefer packaged assets and request review when adapting crops or layouts.</p></article></div></section>
        </main>
        <aside className="ed-brand-rail"><section id="brand-kit-share" className="ed-card"><h3>Share this kit</h3><p>Invite others to view or use MVP 2024.</p><input className="ed-input" value={invite} onChange={(event) => setInvite(event.target.value)} placeholder="Enter email address" aria-label="Invite email address" /><ActionButton tone="primary" disabled={!invite.trim()} onClick={() => { setSentInvite(invite); setInvite(""); setKitMessage("Invite prepared locally. No email was sent from this beta."); }}>Send Invite</ActionButton>{sentInvite ? <p className="ed-inline-success">Invite prepared for {sentInvite}</p> : null}</section><section className="ed-card"><h3>Kit details</h3><dl className="ed-metadata">{[["Current section", section], ["Collection", role === "DAM Admin" && connected ? String(kit?.resourceSpaceCollectionId || "Configured") : connected ? "Configured" : "Not connected"], ["Config key", role === "DAM Admin" ? kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID" : "Admin only"], ["Downloads", connected ? `${kitAssets.length} ${noun} assets` : "Disabled"], ["Owner", kit?.owner || "Brand Team"]].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl></section><section className="ed-card"><header className="ed-card-head"><h3>Quick downloads</h3></header>{connected && kitAssets.length ? kitAssets.slice(0, 5).map((asset) => <p className="ed-file-row" key={asset.id}><FileText size={17} />{displayTitle(asset)}<small>{recordLabel} {assetRecordRef(asset)}</small></p>) : <p>Connect this kit to a {noun} collection.</p>}</section></aside>
      </div>
    </div>
  );
}
