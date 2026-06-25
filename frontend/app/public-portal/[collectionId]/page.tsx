import { Download, Link2, Mail, Share2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ collectionId: string }>;
};

const portalAssets = [
  ["Profile Portraits Set.jpg", "JPG / 18.7 MB", "is-portrait"],
  ["Ceramic Still Life.jpg", "JPG / 12.7 MB", "is-ceramic"],
  ["Product Skincare Line.jpg", "JPG / 32.1 MB", "is-product"],
  ["Mountain Lake Hero.jpg", "JPG / 24.3 MB", "is-mountain"],
  ["Architecture Curve.jpg", "JPG / 29.8 MB", "is-architecture"],
  ["Chair Detail.jpg", "JPG / 11.2 MB", "is-chair"],
  ["Canyon Light.jpg", "JPG / 22.4 MB", "is-canyon"],
  ["Mountain Peaks.jpg", "JPG / 19.1 MB", "is-peaks"],
  ["Ceramic Forms.jpg", "JPG / 14.6 MB", "is-forms"],
  ["Neutral Object Set.jpg", "JPG / 16.8 MB", "is-object"]
];

export default async function PublicPortalCollectionPage({ params }: PageProps) {
  await params;
  return (
    <main className="proto-public-portal">
      <header className="proto-public-header">
        <div className="proto-public-brand"><span>A</span><strong>Archive One</strong></div>
        <button type="button" disabled><Share2 size={16} />Share collection link</button>
      </header>

      <section className="proto-public-hero">
        <div className="proto-public-hero-copy">
          <h1>Spring Campaign 2024</h1>
          <span><ShieldCheck size={15} />Approved collection</span>
          <p>Curated brand assets for Spring Campaign 2024. Approved and ready for use across all allowed channels.</p>
        </div>
        <aside className="proto-public-access-card">
          <header><div className="proto-public-brand-icon">A1</div><div><strong>Acme Inc.</strong><small>Brand</small></div></header>
          <dl>
            <div><dt>Allowed channels</dt><dd>Web, Social, Email, Print</dd></div>
            <div><dt>Region</dt><dd>Worldwide</dd></div>
            <div><dt>Expires</dt><dd>May 14, 2026</dd></div>
            <div><dt>Contact</dt><dd>Taylor Morgan / Brand Manager</dd></div>
          </dl>
          <button type="button" disabled className="is-primary"><Download size={16} />Download all disabled</button>
          <button type="button" disabled><Mail size={16} />Request asset</button>
          <button type="button" disabled><Link2 size={16} />Share collection link</button>
        </aside>
      </section>

      <section className="proto-public-intro">
        <article>
          <h2>About this collection</h2>
          <p>This collection includes final, approved assets for Spring Campaign 2024. Use these assets to bring the spring story to life with consistency and impact.</p>
        </article>
        <article>
          <h2>Usage notes</h2>
          {["Use approved assets only", "Do not alter or crop logos", "Maintain clear space and legibility", "Follow brand guidelines at all times"].map((note) => <p key={note}><ShieldCheck size={14} />{note}</p>)}
        </article>
      </section>

      <section className="proto-public-assets">
        <header><strong>12 assets</strong><div><span>Sort:</span><button type="button">Newest</button></div></header>
        <div className="proto-public-grid">
          {portalAssets.map(([name, meta, klass]) => (
            <article key={name}>
              <div className={`proto-public-photo ${klass}`} />
              <h3><ShieldCheck size={14} />{name}</h3>
              <p>{meta}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
