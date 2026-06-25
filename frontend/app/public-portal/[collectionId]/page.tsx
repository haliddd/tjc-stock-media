import { ShieldCheck } from "lucide-react";
import { PublicPortalAccessActions, PublicPortalHeaderActions } from "./PublicPortalActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ collectionId: string }>;
};

const portalAssets = [
  ["Bible Teaching Background.jpg", "JPG / approved copy", "is-mountain", "Rights-safe"],
  ["Sabbath Flower Arrangement.jpg", "JPG / approved copy", "is-ceramic", "Rights-safe"],
  ["Welcome Team Detail.jpg", "JPG / needs reviewer note", "is-portrait", "Request"],
  ["Teaching Handout.jpg", "JPG / internal only", "is-forms", "Internal"],
  ["Church Architecture Detail.jpg", "JPG / approved copy", "is-architecture", "Rights-safe"],
  ["Fellowship Table Detail.jpg", "JPG / review needed", "is-chair", "Request"],
  ["Outdoor Baptism Setting.jpg", "JPG / needs scope check", "is-canyon", "Request"],
  ["Sabbath Service Slides.jpg", "JPG / approved copy", "is-peaks", "Rights-safe"],
  ["Hymn Archive Reference.jpg", "Audio / archive only", "is-object", "Archive"],
  ["Newsletter Texture.jpg", "JPG / approved copy", "is-product", "Rights-safe"]
];

export default async function PublicPortalCollectionPage({ params }: PageProps) {
  await params;
  return (
    <main className="proto-public-portal">
      <header className="proto-public-header">
        <div className="proto-public-brand"><span>T</span><strong>TJC Media Library</strong></div>
        <PublicPortalHeaderActions />
      </header>

      <section className="proto-public-hero">
        <div className="proto-public-hero-copy">
          <h1>Sabbath Service Media</h1>
          <span><ShieldCheck size={15} />Approved collection</span>
          <p>Curated church media for public website and ministry communications. Item-level rights and people/youth gates still apply.</p>
        </div>
        <aside className="proto-public-access-card">
          <header><div className="proto-public-brand-icon">TJC</div><div><strong>True Jesus Church</strong><small>Media Team</small></div></header>
          <dl>
            <div><dt>Allowed channels</dt><dd>Website, newsletter, internal slides</dd></div>
            <div><dt>Region</dt><dd>Church media use</dd></div>
            <div><dt>Expires</dt><dd>Reviewer recheck required</dd></div>
            <div><dt>Contact</dt><dd>Media Team / Rights Reviewer</dd></div>
          </dl>
          <PublicPortalAccessActions />
        </aside>
      </section>

      <section className="proto-public-intro">
        <article>
          <h2>About this collection</h2>
          <p>This local demo collection shows how TJC-approved media could be shared with ministries or agencies. Source originals remain restricted.</p>
        </article>
        <article>
          <h2>Usage notes</h2>
          {["Use approved assets only", "Do not crop away worship or ministry context", "Request review when people or youth appear", "Downloads are disabled until item gates pass"].map((note) => <p key={note}><ShieldCheck size={14} />{note}</p>)}
        </article>
      </section>

      <section className="proto-public-assets">
        <header><strong>12 assets</strong><div><span>Sort:</span><button type="button">Newest</button></div></header>
        <div className="proto-public-grid">
          {portalAssets.map(([name, meta, klass, state]) => (
            <article key={name}>
              <div className={`proto-public-photo ${klass}`} />
              <h3><ShieldCheck size={14} />{name}</h3>
              <p>{meta}</p>
              <span className="proto-public-readiness">{state}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
