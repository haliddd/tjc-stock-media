import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpDown, Download, Mail, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { GatedDownloadButton } from "@/components/GatedDownloadButton";
import { MediaPreview } from "@/components/MediaPreview";
import {
  loadPublicPortalPreview,
  normalizePublicPortalMediaType,
  normalizePublicPortalSort,
  publicPortalCollectionIds,
  type PublicPortalMediaType,
  type PublicPortalSort
} from "@/lib/public-portal-preview";
import { assetDisplayTitle } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<{ sort?: string; mediaType?: string }>;
};

const sortLabels: Record<PublicPortalSort, string> = {
  curated: "Curated",
  newest: "Newest",
  title: "Title"
};

const mediaTypeLabels: Record<PublicPortalMediaType, string> = {
  all: "All media",
  photo: "Photos",
  video: "Videos",
  audio: "Audio",
  graphic: "Graphics",
  document: "Documents"
};

function filterHref(collectionId: string, next: { sort?: PublicPortalSort; mediaType?: PublicPortalMediaType }) {
  const params = new URLSearchParams();
  if (next.sort && next.sort !== "curated") params.set("sort", next.sort);
  if (next.mediaType && next.mediaType !== "all") params.set("mediaType", next.mediaType);
  const query = params.toString();
  return `/public-portal/${encodeURIComponent(collectionId)}${query ? `?${query}` : ""}`;
}

export async function generateStaticParams() {
  return publicPortalCollectionIds().map((collectionId) => ({ collectionId }));
}

export default async function PublicPortalCollectionPage({ params, searchParams }: PageProps) {
  const { collectionId } = await params;
  const query = await searchParams;
  const sort = normalizePublicPortalSort(query.sort);
  const mediaType = normalizePublicPortalMediaType(query.mediaType);
  const preview = await loadPublicPortalPreview({ collectionId, sort, mediaType });

  if (!preview) notFound();

  const heroAsset = preview.assets[0];

  return (
    <main className="min-h-dvh bg-[#f7f4ee] text-[#151713]">
      <header className="border-b border-[#ded8cc] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/collections" className="text-sm font-black tracking-[0.12em] text-[#224b35]">
            True Jesus Church Media Library
          </Link>
          <span className="rounded-full border border-[#d4cabb] bg-[#fbfaf7] px-3 py-1 text-xs font-black text-[#6b604e]">
            {preview.localDemoNotice}
          </span>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.42fr)] lg:px-8 lg:py-8">
        <div className="overflow-hidden rounded-[8px] border border-[#ded8cc] bg-white">
          <div className="relative aspect-[16/8] min-h-[280px] bg-[#ebe5da]">
            <MediaPreview
              src={heroAsset?.imageUrls?.detail || heroAsset?.imageUrls?.collection || heroAsset?.preview || heroAsset?.thumbnail}
              alt={heroAsset?.thumbnailAlt || `${preview.collection.name} collection preview`}
              label={heroAsset ? "Preview unavailable" : "No Portal Ready assets"}
              detail={heroAsset ? "Role-safe preview missing." : "This collection has no Portal Ready assets in the current media source."}
              className="h-full w-full"
              imgClassName="h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">Public portal preview</p>
              <h1 className="mt-2 max-w-4xl text-4xl font-black leading-[0.95] sm:text-6xl">{preview.collection.name}</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-white/90 sm:text-base">{preview.collection.description}</p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#eee7dc] p-4 sm:grid-cols-3">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#837763]">Usable assets</span>
              <strong className="mt-1 block text-2xl font-black">{preview.counts.shown.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#837763]">Portal Ready</span>
              <strong className="mt-1 block text-2xl font-black">{preview.counts.portalReady.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#837763]">Collection matches</span>
              <strong className="mt-1 block text-2xl font-black">{preview.counts.collectionMatches.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-3">
          <section className="rounded-[8px] border border-[#cbdccc] bg-[#f3fbf5] p-4 text-[#214b34]">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <h2 className="text-base font-black">Rights summary</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed">{preview.rightsSummary}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[8px] border border-[#ded8cc] bg-white p-4">
            <h2 className="text-base font-black">Usage notes</h2>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-relaxed text-[#5d655d]">
              {preview.usageNotes.map((note) => <li key={note}>{note}</li>)}
            </ul>
            <p className="mt-3 rounded-[6px] bg-[#fff8e8] px-3 py-2 text-sm font-bold text-[#785a16]">{preview.expirationNotice}</p>
          </section>

          <section className="rounded-[8px] border border-[#ded8cc] bg-white p-4">
            <h2 className="text-base font-black">Contact reviewer</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5d655d]">Need a different use, missing approval, or source-file access? Contact the Media Team.</p>
            <a
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[6px] bg-[#151713] px-4 text-sm font-black text-white"
              href={`mailto:${preview.contactPath}?subject=${encodeURIComponent(`Media request: ${preview.collection.name}`)}`}
            >
              <Mail size={16} aria-hidden="true" />
              Request help
            </a>
          </section>
        </aside>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col justify-between gap-3 border-y border-[#ded8cc] py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black">Approved usable media</h2>
            <p className="text-sm font-semibold text-[#697166]">Showing Portal Ready assets only from current media library records.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["curated", "newest", "title"] as PublicPortalSort[]).map((item) => (
              <Link
                key={item}
                className={`inline-flex min-h-9 items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${sort === item ? "border-[#151713] bg-[#151713] text-white" : "border-[#d8d1c5] bg-white text-[#394238]"}`}
                href={filterHref(collectionId, { sort: item, mediaType })}
              >
                <ArrowUpDown size={14} aria-hidden="true" />
                {sortLabels[item]}
              </Link>
            ))}
            {preview.filters.mediaTypes.map((item) => (
              <Link
                key={item}
                className={`inline-flex min-h-9 items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${mediaType === item ? "border-[#224b35] bg-[#e8f4ec] text-[#224b35]" : "border-[#d8d1c5] bg-white text-[#394238]"}`}
                href={filterHref(collectionId, { sort, mediaType: item })}
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                {mediaTypeLabels[item]}
              </Link>
            ))}
          </div>
        </div>

        {preview.assets.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {preview.assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-[8px] border border-[#ded8cc] bg-white">
                <div className="aspect-[4/3] bg-[#eee8dc]">
                  <MediaPreview
                    src={asset.imageUrls?.card || asset.imageUrls?.collection || asset.preview || asset.thumbnail}
                    alt={asset.thumbnailAlt || assetDisplayTitle(asset)}
                    label="Preview unavailable"
                    detail="Role-safe preview missing."
                    className="h-full w-full"
                  />
                </div>
                <div className="grid gap-3 p-3">
                  <div>
                    <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-snug">{assetDisplayTitle(asset)}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#6b725f]">{asset.mediaType} · {asset.peopleRisk || "People reviewed"}</p>
                  </div>
                  <p className="line-clamp-3 min-h-14 text-sm font-semibold leading-relaxed text-[#4f584e]">
                    {asset.usageGuidance || "Use within approved public ministry guidance."}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(asset.usageTerms || asset.tjcTerms || asset.tags || []).slice(0, 3).map((term) => (
                      <span key={term} className="rounded-full bg-[#f2efe8] px-2 py-1 text-xs font-black text-[#596052]">{term}</span>
                    ))}
                  </div>
                  <GatedDownloadButton
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#151713] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    href={asset.publicDownloadHref}
                    reason={`Public portal preview approved-copy request for ${assetDisplayTitle(asset)}`}
                    usageChannel="public-portal-preview"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download approved copy
                  </GatedDownloadButton>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-[#ded8cc] bg-white p-8">
            <div className="text-center">
            <h2 className="text-2xl font-black">No Portal Ready assets in this preview</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[#5d655d]">
              Collection records may exist, but none pass public preview gates for this filter. Request review before reuse or distribution.
            </p>
            <a
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[6px] bg-[#151713] px-4 text-sm font-black text-white"
              href={`mailto:${preview.contactPath}?subject=${encodeURIComponent(`Review request: ${preview.collection.name}`)}`}
            >
              <Mail size={16} aria-hidden="true" />
              Request review
            </a>
            </div>
            {preview.readinessDiagnostics.length ? (
              <section className="mt-6 border-t border-[#eee7dc] pt-5 text-left" aria-labelledby="public-portal-readiness-title">
                <h3 id="public-portal-readiness-title" className="text-base font-black">Readiness diagnostics</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#5d655d]">
                  Counts below explain why matching records are not Portal Ready. They use review-safe exported fields only.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {preview.readinessDiagnostics.map((item) => (
                    <article key={item.id} className="rounded-[8px] border border-[#ded8cc] bg-[#fbfaf7] p-4">
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#837763]">{item.label}</span>
                      <strong className="mt-1 block text-2xl font-black">{item.count.toLocaleString()}</strong>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5d655d]">{item.detail}</p>
                      <Link className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-[#d8d1c5] bg-white px-3 text-sm font-black text-[#394238]" href={item.href}>
                        <Search size={14} aria-hidden="true" />
                        Open review queue
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
