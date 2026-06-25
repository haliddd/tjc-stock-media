import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Download,
  Eye,
  Folder,
  Grid2X2,
  Image as ImageIcon,
  LockKeyhole,
  MoreHorizontal,
  PenLine,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";

const navItems = [
  ["Product", true],
  ["Solutions", true],
  ["Resources", true],
  ["Pricing", false],
  ["Company", true],
] as const;

const sidebarItems = [
  ["Library", ImageIcon],
  ["Collections", Folder],
  ["Brand Kits", Grid2X2],
  ["Shared with me", UserRound],
  ["Favorites", Star],
  ["Recent", Circle],
  ["Trash", Trash2],
] as const;

const savedViews = ["Sabbath service", "Website", "Teaching assets", "Need review", "Expiring soon", "New view"];

const mockAssets = ["is-mountain", "is-portrait", "is-ceramic", "is-peaks", "is-product", "is-architecture", "is-canyon", "is-chair", "is-forms"];

const roles = [
  ["Viewer", "Find the right assets, verify usage rights, and download with confidence.", Eye, "is-green"],
  ["Contributor", "Upload and organize assets with metadata, collections, and brand kits.", PenLine, "is-amber"],
  ["Reviewer", "Review, request changes, and approve assets with clear workflows.", CheckCircle2, "is-rose"],
  ["Admin", "Enforce governance, manage access, and ensure brand and legal compliance.", ShieldCheck, "is-blue"],
] as const;

const features = [
  ["Rights-safe search", "Search across metadata, tags, and content with built-in rights and license awareness.", Search],
  ["Smart approvals", "Route assets for review, gather feedback, and approve all in one place.", CheckCircle2],
  ["Metadata governance", "Standardize fields, control vocabularies, and maintain trusted, clean data.", ShieldCheck],
  ["Brand consistency", "Use brand kits, templates, and guidelines to keep every asset on brand, every time.", Grid2X2],
  ["Secure distribution", "Share assets securely with audience-based access and watermarking controls.", LockKeyhole],
] as const;

function MarketingLandingPage() {
  return (
    <main className="proto-marketing-page">
      <nav className="proto-marketing-nav">
        <Link className="proto-marketing-brand" href="/" aria-label="TJC Media Library home"><span>T</span><strong>TJC Media Library</strong></Link>
        <div className="proto-marketing-links">
          {navItems.map(([item, hasMenu]) => <Link href="/library" key={item}>{item}{hasMenu ? <ChevronDown size={13} /> : null}</Link>)}
        </div>
        <div className="proto-marketing-auth"><Link href="/library">Sign in</Link><Link className="is-primary" href="/library">Request a demo</Link></div>
      </nav>

      <section className="proto-marketing-hero">
        <div className="proto-marketing-copy">
          <span className="proto-marketing-eyebrow">The intelligent DAM for modern teams</span>
          <h1>A church media DAM for teams that need control.</h1>
          <p>Organize, review, protect, and distribute TJC media with confidence. The portal keeps rights, people/youth safety, and ResourceSpace truth visible.</p>
          <div className="proto-marketing-actions"><Link className="is-primary" href="/library">Request a demo <ArrowRight size={16} /></Link><Link href="/library">Explore the product</Link></div>
          <div className="proto-marketing-logos"><span>TJC Media</span><span>ResourceSpace</span><span>Shared Drive</span><span>Reviewer Queue</span><span>Approved Copies</span></div>
        </div>

        <div className="proto-marketing-mockup" aria-label="TJC Media Library product mockup">
          <aside className="proto-marketing-mock-sidebar">
            <div className="proto-marketing-app-brand"><span>T</span><strong>TJC Media Library</strong></div>
            <div className="proto-marketing-nav-list">
              {sidebarItems.map(([item, Icon], index) => <span className={index === 0 ? "is-active" : ""} key={item}><Icon size={13} />{item}</span>)}
            </div>
            <div className="proto-marketing-saved">
              <div><strong>Saved views</strong><ChevronDown size={12} /><button aria-label="Add saved view">+</button></div>
              {savedViews.map((item) => <span key={item}><Bookmark size={12} />{item}</span>)}
            </div>
            <div className="proto-marketing-user"><div className="proto-user-avatar" /> <span><strong>Media Team</strong><small>DAM Admin</small></span><ChevronDown size={13} /></div>
          </aside>
          <section className="proto-marketing-library">
            <header className="proto-marketing-mock-topbar">
              <label><Search size={14} />Search assets, tags, collections...<kbd>&#8984; K</kbd></label>
              <button><SlidersHorizontal size={14} />Filters</button>
              <button><Bookmark size={14} />Saved views</button>
              <span className="proto-marketing-rights">Rights-safe only <i><Check size={10} /></i></span>
            </header>
            <div className="proto-marketing-library-head"><strong>12,456 assets</strong><span>Sort: <b>Newest</b> <ChevronDown size={12} /></span><button aria-label="Grid view"><Grid2X2 size={14} /></button></div>
            <div className="proto-marketing-grid">{mockAssets.map((klass, index) => <div className={`proto-marketing-asset proto-public-photo ${klass}${index === 0 ? " is-selected" : ""}`} key={klass}>{index === 0 ? <Check size={16} /> : null}</div>)}</div>
          </section>
          <aside className="proto-marketing-inspector">
            <button aria-label="Close inspector">&times;</button>
            <div className="proto-public-photo is-mountain" />
            <h2>Bible Teaching Background.jpg</h2>
            <span className="proto-status is-approved">Approved</span>
            <small>TJC-367 / approved copy / JPG</small>
            <dl>
              <div><dt>Collection</dt><dd>Teaching & Study</dd></div>
              <div><dt>Usage rights</dt><dd>Website / Slides / Newsletter</dd></div>
              <div><dt>License</dt><dd>TJC-owned</dd></div>
              <div><dt>Usage channels</dt><dd>Public ministry use</dd></div>
              <div><dt>Region</dt><dd>Church media</dd></div>
              <div><dt>Expires</dt><dd>Reviewer recheck</dd></div>
              <div><dt>Owner</dt><dd>Media Team</dd></div>
            </dl>
            <button className="is-download"><Download size={14} />Download <ChevronDown size={13} /></button>
            <div className="proto-marketing-mini-actions"><button><Share2 size={13} />Share</button><button><Folder size={13} />Add to collection</button></div>
            <button className="is-more"><MoreHorizontal size={14} />More actions</button>
          </aside>
        </div>
      </section>

      <section className="proto-role-row">
        <h2>Built for every role on your team</h2>
        {roles.map(([role, copy, Icon, tone]) => <article key={role}><Icon className={tone} size={22} /><div><strong>{role}</strong><p>{copy}</p></div></article>)}
      </section>

      <section className="proto-feature-row">
        <h2>Trusted asset control from start to finish</h2>
        {features.map(([title, copy, Icon], index) => (
          <article key={title}>
            <Icon size={18} />
            <h3>{title}</h3>
            <p>{copy}</p>
            {index === 0 ? <div className="proto-feature-mini is-search"><span><Search size={13} />campaign hero lakes</span><div><i className="proto-public-photo is-mountain" /><i className="proto-public-photo is-ceramic" /></div><small><Check size={12} />Safe to use</small></div> : null}
            {index === 1 ? <div className="proto-feature-mini is-approval"><i className="proto-public-photo is-mountain" /><span><strong>Bible Teaching Background.jpg</strong><small>In review</small></span><b>+2</b></div> : null}
            {index === 2 ? <div className="proto-feature-mini is-table"><span>License <b>TJC-owned</b><Check size={12} /></span><span>Usage <b>Ministry use</b><Check size={12} /></span><span>Source <b>ResourceSpace</b><Check size={12} /></span></div> : null}
            {index === 3 ? <div className="proto-feature-mini is-brand"><strong>TJC</strong><span>Aa</span><i /><i /><i /></div> : null}
            {index === 4 ? <div className="proto-feature-mini is-share"><span><Share2 size={12} />External share request <LockKeyhole size={12} /></span><strong>Sabbath Service Media</strong><small>Pending reviewer gate</small></div> : null}
          </article>
        ))}
      </section>
    </main>
  );
}

export default function Page() {
  return <MarketingLandingPage />;
}
