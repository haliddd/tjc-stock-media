"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileText, MoreHorizontal, PackageCheck, ShieldAlert, Star } from "lucide-react";
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
  { id: "brand-assets", label: "Assets" },
  { id: "brand-channels", label: "Channels" }
];

export function EnterpriseBrandHubPage() {
  const { role } = useDemoRole();
  const brandKit = useBrandKit("mvp-2024", role);
  const [section, setSection] = useState(brandSections[0].label);
  const [reviewRecipient, setReviewRecipient] = useState("");
  const [sentReviewRecipient, setSentReviewRecipient] = useState("");
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
  const brandRawSourceLabel = sourceLabel(brandKit.source);
  const brandSourceLabel = brandKit.source?.adapter === "demo-fallback"
    ? "Local beta catalog"
    : brandRawSourceLabel.replace(/\bexport\b/gi, "snapshot");
  const readyScore = governance?.totalAssets ? Math.round((governance.portalReadyAssets / governance.totalAssets) * 100) : 0;
  const reviewNoteDisabledReason = governance?.canShare ? undefined : governance?.summary || "Review note waits for configured Brand Kit assets that pass current role policy.";
  const gateDisabledReason = governance?.canDownloadKit ? undefined : governance?.summary || (role === "DAM Admin" ? "Gate check disabled until this kit is connected to a ResourceSpace collection." : "Gate check disabled until this kit is connected to mapped media.");
  const rawNextSafeAction = presentBrandKitContext(governance, role, connected);
  const nextSafeAction = {
    ...rawNextSafeAction,
    nextTitle: rawNextSafeAction.nextTitle.replace("Kit readiness packet ready", "Kit gate check ready"),
    nextDetail: rawNextSafeAction.nextDetail
      .replace(/[^.]*delivery is still off\./i, "No files, sends, hosted URLs, or source writes are created from this panel.")
      .replace(/No kit [a-z]+ is shown/i, "No file package is shown")
  };
  const configureCollection = () => {
    setSetupOpen(true);
    setMoreOpen(false);
    setKitMessage(role === "DAM Admin"
      ? `Set ${kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"} in server environment, then reload Brand Hub.`
      : "Ask a DAM Admin to connect the mapped media set.");
  };
  const focusReviewNote = () => {
    document.getElementById("brand-kit-review-note")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setKitMessage(governance?.deliveryReady ? "Review note can be drafted. Email sending and file packaging stay off." : "Review note waits for mapped kit assets.");
  };
  return (
    <div className="enterprise-page enterprise-brand">
      <div className="ed-brand-top"><div className="ed-breadcrumb">Brand Hub <span>›</span> Ministry Kits <span>›</span> MVP 2024</div><div><ActionButton icon={Star} onClick={() => setKitMessage("MVP 2024 saved as a local preference.")}>Save</ActionButton><ActionButton icon={FileText} disabled={Boolean(governance && !governance.canShare)} disabledReason={reviewNoteDisabledReason} onClick={focusReviewNote}>Review note</ActionButton><ActionButton tone="dark" icon={ShieldAlert} disabled={Boolean(governance && !governance.canDownloadKit)} disabledReason={gateDisabledReason} onClick={() => setKitMessage(governance?.deliveryReady ? "Kit gate check passed locally. No files, hosted URLs, emails, or source copies were created." : gateDisabledReason || "Gate check disabled.")}>Check gates</ActionButton><div className="ed-action-menu-wrap"><IconButton label="More" onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={16} /></IconButton>{moreOpen ? <div className="ed-more-actions-menu ed-brand-more" role="menu"><button type="button" onClick={configureCollection}>View setup details<span>{role === "DAM Admin" ? "Show server env key and collection status." : "Admin setup required."}</span></button><button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); setKitMessage("Internal page URL copied. Access remains role-gated."); setMoreOpen(false); }}>Copy internal URL<span>Copies this Brand Hub page URL.</span></button><a href={routeWithRole("/help", role)} onClick={() => setMoreOpen(false)}>Open Help Center<span>Role-safe media guidance.</span></a></div> : null}</div></div></div>
      {kitMessage ? <p className="ed-inline-success ed-brand-status">{kitMessage}</p> : null}
      <div className="ed-brand-layout">
        <section className="ed-brand-main">
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
          <section id="brand-overview" className="ed-brand-hero"><div><span>MINISTRY KIT</span><h1>Brand Hub <em>{connected ? "Connected" : "Setup needed"}</em></h1><p><strong>{kit?.title || "MVP 2024"}.</strong> Editorial guidance can be curated here, but file access stays gated until media-team review.</p><dl><div><dt>Owner</dt><dd>{kit?.owner || "Brand Team"}</dd></div><div><dt>Data source</dt><dd>{role === "DAM Admin" ? brandSourceLabel : connected ? "Media library" : "Not connected"}</dd></div><div><dt>Next step</dt><dd>{connected ? "Review mapped assets" : "Connect media set"}</dd></div></dl></div></section>
          {brandKit.loading ? <LoadingCard label="Loading Brand Kit mapping..." /> : null}
          {!brandKit.loading && !connected ? <section className="ed-card ed-empty-state"><Database size={24} /><h2>{role === "DAM Admin" ? `Connect this kit to a ${noun} collection` : "Connect this kit to mapped media"}</h2><p>{role === "DAM Admin" ? <>Set <strong>{kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"}</strong> before showing governed kit references.</> : "Ask a DAM Admin to connect mapped kit assets."} Review-note and gate-check actions stay disabled until setup is complete.</p><ActionButton onClick={configureCollection}>{role === "DAM Admin" ? "View setup details" : "Ask DAM Admin"}</ActionButton></section> : null}
          {setupOpen ? <section className="ed-card ed-setup-note"><strong>{role === "DAM Admin" ? "ResourceSpace collection setup" : "Admin setup required"}</strong><p>{role === "DAM Admin" ? `Server env key: ${kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID"}. Current collection: ${kit?.resourceSpaceCollectionId || "not configured"}. This panel does not write to ResourceSpace.` : "A DAM Admin needs to connect this kit before review-note gates can open."}</p></section> : null}
          {brandKit.data?.collectionStatus && !brandKit.data.collectionStatus.ok ? <section className="ed-card ed-setup-note"><strong>Collection read blocked</strong><p>{brandKit.data.collectionStatus.message}</p></section> : null}
          {(brandKit.data?.warnings || []).length ? <section className="ed-card ed-setup-note"><strong>Setup warnings</strong>{brandKit.data?.warnings.map((warning) => <p key={warning}>{warning}</p>)}</section> : null}
          {governance ? <section className="ed-card ed-brand-governance"><header className="ed-card-head"><h3>Kit gates</h3><span>{governance.portalReadyAssets}/{governance.totalAssets} gate-ready</span></header><div className="ed-brand-readiness"><div><strong>{readyScore}%</strong><span>gate check</span></div><div className="ed-readiness-meter" aria-label={`Brand kit gate check ${readyScore}%`}><span style={{ width: `${readyScore}%` }} /></div><p>{governance.summary}</p></div><div className={`ed-brand-next-action is-${nextSafeAction.tone}`}><PackageCheck size={18} /><div><strong>{nextSafeAction.nextTitle}</strong><span>{nextSafeAction.nextDetail}</span></div><button type="button" onClick={nextSafeAction.tone === "blocked" ? configureCollection : governance.deliveryReady ? () => setKitMessage("Gate check prepared locally. No files, hosted URLs, source copies, emails, or source writes were created.") : () => setKitMessage(`Review note still blocked: ${governance.blockers.slice(0, 3).join(" ")}`)}>{nextSafeAction.nextAction}</button></div><div className="ed-brand-proof-grid"><span><strong>{governance.portalReadyAssets}</strong><small>Gate-ready</small></span><span><strong>{governance.internalOnlyAssets}</strong><small>Internal only</small></span><span><strong>{governance.reviewRequiredAssets}</strong><small>Need review</small></span><span><strong>{governance.missingSectionMappings}</strong><small>Missing sections</small></span></div><div className="ed-command-readiness">{governance.commands.map((item) => <p className={`is-${item.status}`} key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></p>)}</div>{governance.readinessPacket.manifests[0] ? <div className="ed-command-readiness">{governance.readinessPacket.manifests[0].items.map((item) => <p className={`is-${item.status === "ready" ? "ready" : item.status === "request-only" ? "review" : "blocked"}`} key={item.id}><strong>{item.label}</strong><span>{item.detail}</span></p>)}</div> : null}{governance.blockers.length ? <div className="ed-brand-blockers">{governance.blockers.slice(0, 4).map((blocker) => <p key={blocker}><AlertTriangle size={14} />{blocker}</p>)}</div> : <p className="ed-inline-success"><CheckCircle2 size={14} />No kit gate blockers for current role. File access remains reviewer-gated.</p>}</section> : <section className="ed-card ed-brand-governance"><header className="ed-card-head"><h3>Kit gates</h3><span>Waiting for mapping</span></header><p><ShieldAlert size={14} />Connect a mapped media set before review-note actions open.</p></section>}
          <section id="brand-usage" className="ed-card ed-brand-section"><h3>How to use these assets</h3><p>Use mapped references for planning. Ask for review when scope or file access is unclear.</p><div className="ed-principle-grid">{principles.map((principle) => <article key={principle.title}><CheckCircle2 size={20} /><strong>{principle.title}</strong><p>{principle.description}</p></article>)}</div></section>
          <section id="brand-logo" className="ed-card ed-brand-section"><header className="ed-card-head"><h3>Logo usage</h3><a href="#brand-assets" onClick={() => setSection("Assets")}>View mapped logo assets</a></header><div className="ed-logo-grid">{logoUsage.map((item) => <article key={item.title} className={item.discouraged ? "is-wrong" : ""}><div><img src={item.variant === "reverse" ? "/brand/tjc-logo-english-white.png" : "/brand/tjc-logo-english-color.png"} alt="True Jesus Church logo" /></div><strong>{item.title}</strong><small>{item.guidance}</small></article>)}</div></section>
          <div className="ed-two-col">
            <section id="brand-messages" className="ed-card ed-brand-section"><h3>Key messages</h3>{keyMessages.map((item) => <p className="ed-checkline" key={item}><CheckCircle2 size={16} />{item}</p>)}</section>
            <section id="brand-assets" className="ed-card ed-brand-section"><header className="ed-card-head"><h3>{role === "DAM Admin" ? `${noun} kit assets` : "Kit assets"}</h3>{role === "DAM Admin" ? <SourcePill source={brandKit.source} live={brandKit.live} /> : null}</header><div className="ed-photo-row">{kitAssets.slice(0, 4).map((asset) => <AssetThumb asset={asset} key={asset.id} />)}</div><p>{kitAssets.length ? (role === "DAM Admin" ? "Assets matched configured ResourceSpace collection/source membership. No files are generated from this panel." : "Assets matched the configured kit. File access remains reviewer-gated.") : "No mapped kit assets yet."}</p></section>
          </div>
          <section id="brand-channels" className="ed-card ed-brand-section"><h3>Channel guidance</h3><div className="ed-principle-grid"><article><CheckCircle2 size={20} /><strong>Church web and app</strong><p>Use reviewer-cleared derivatives and keep captions reverent, accurate, and current.</p></article><article><CheckCircle2 size={20} /><strong>Social and announcements</strong><p>Confirm public scope, consent, and youth visibility before any posting.</p></article><article><CheckCircle2 size={20} /><strong>Print and slides</strong><p>Prefer reviewed assets and request review when adapting crops or layouts.</p></article></div></section>
        </section>
        <aside className="ed-brand-rail"><section id="brand-kit-review-note" className="ed-card"><h3>Review note</h3><p>Draft an internal review note for MVP 2024. No email, hosted URL, or file package is created.</p><input className="ed-input" value={reviewRecipient} onChange={(event) => setReviewRecipient(event.target.value)} placeholder="Reviewer or team label" aria-label="Reviewer or team label" /><ActionButton tone="primary" disabled={!reviewRecipient.trim()} onClick={() => { setSentReviewRecipient(reviewRecipient); setReviewRecipient(""); setKitMessage("Review note prepared locally. No email was sent."); }}>Prepare review note</ActionButton>{sentReviewRecipient ? <p className="ed-inline-success">Review note prepared for {sentReviewRecipient}</p> : null}</section><section className="ed-card"><h3>Kit details</h3><dl className="ed-metadata">{[["Current section", section], ["Collection", role === "DAM Admin" && connected ? String(kit?.resourceSpaceCollectionId || "Configured") : connected ? "Configured" : "Not connected"], ["Config key", role === "DAM Admin" ? kit?.collectionEnvKey || "BRAND_KIT_MVP_2024_COLLECTION_ID" : "Admin only"], ["Gate check", connected ? `${kitAssets.length} governed ${role === "DAM Admin" ? noun : "kit"} references` : "Disabled"], ["Owner", kit?.owner || "Brand Team"]].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl></section><section className="ed-card"><header className="ed-card-head"><h3>Mapped references</h3></header>{connected && kitAssets.length ? kitAssets.slice(0, 5).map((asset) => <p className="ed-file-row" key={asset.id}><FileText size={17} />{displayTitle(asset)}<small>{role === "DAM Admin" ? `${recordLabel} ${assetRecordRef(asset)}` : "Media reference"}</small></p>) : <p>{role === "DAM Admin" ? `Connect this kit to a ${noun} collection.` : "Connect this kit to mapped media."}</p>}</section></aside>
      </div>
    </div>
  );
}
