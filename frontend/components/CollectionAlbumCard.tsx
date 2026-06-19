"use client";

import { ArrowRight, CalendarDays, CheckCircle2, FolderOpen, Images, Users } from "lucide-react";
import { MediaPreview } from "@/components/MediaPreview";
import { TjcStatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/ui";

type CollectionAlbumCardProps = {
  name: string;
  description: string;
  countLabel: string;
  dateRange: string;
  ministry: string;
  approvalSummary: string;
  peopleWarning?: string;
  images: { src: string; alt: string }[];
  isActive?: boolean;
  inspectLabel?: string;
  onInspect?: () => void;
  onOpen: () => void;
};

function AlbumPlaceholder({ name, title, className, label = "Album cover" }: { name: string; title: string; className?: string; label?: string }) {
  return (
    <span className={cn("relative grid h-full min-h-20 w-full place-items-center overflow-hidden rounded-md border border-[#cfd9d2] bg-[#eef3ef] p-3 text-center text-[#174d37]", className)} aria-label={`${name} album cover`}>
      <span className="absolute inset-2 rounded-md border border-[#d8e2dc]" aria-hidden="true" />
      <span className="relative z-[1] grid justify-items-center gap-1.5">
        <span className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd9d2] bg-white">
          <FolderOpen size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <strong className="text-[11px] font-black leading-tight">{title}</strong>
        <span className="text-[10px] font-black uppercase opacity-70">{label}</span>
      </span>
    </span>
  );
}

export function CollectionAlbumCard({
  name,
  description,
  countLabel,
  dateRange,
  ministry,
  approvalSummary,
  peopleWarning,
  images,
  isActive = false,
  inspectLabel = "View details",
  onInspect,
  onOpen
}: CollectionAlbumCardProps) {
  const hasPeopleWarning = Boolean(peopleWarning);
  const hasAssets = !countLabel.startsWith("0 ");
  const statusTone = hasPeopleWarning ? "warning" : hasAssets ? "success" : "neutral";
  const statusLabel = hasPeopleWarning ? "People review" : hasAssets ? "Ready to use" : "No assets yet";
  const bestUse = /slide|sermon|teaching|bible/i.test(`${name} ${description}`)
    ? "Best for slides and teaching visuals"
    : /website|hero|banner/i.test(`${name} ${description}`)
      ? "Best for website pages"
      : /newsletter|social|announcement/i.test(`${name} ${description}`)
        ? "Best for newsletters and announcements"
        : "Best as a ministry starting point";
  const safetySummary = hasPeopleWarning
    ? "Reviewer should clear people/minors notes before public use."
    : hasAssets
      ? "Open album and follow each asset's usage guidance."
      : "Reviewer-approved media will appear here later.";

  return (
    <article
      className={cn(
        "group relative grid min-w-0 gap-4 overflow-hidden rounded-md border bg-white p-3 text-left transition hover:border-[#8aa99a] hover:bg-[#fbfdfb] md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]",
        isActive ? "border-[#0b4b42] bg-[#f6fbf7] ring-1 ring-inset ring-[#8fb2a5]" : "border-[#d4ded7]"
      )}
      aria-label={`${name} album card`}
      onPointerEnter={onInspect}
    >
      <button
        className="absolute inset-0 z-[1] hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f4f45] md:block"
        type="button"
        onClick={onInspect || onOpen}
        aria-label={onInspect ? `Select ${name}` : `Open ${name} album`}
      />
      <div className="pointer-events-none relative z-[2] grid max-w-full grid-cols-[1.45fr_.88fr] gap-2 overflow-hidden rounded-md bg-[#edf3ef] p-1.5" aria-hidden="true">
        {images.length ? (
          <>
            <span className="row-span-2 grid aspect-[4/3] place-items-center overflow-hidden rounded-md border border-[#d6e0d8] bg-[#f4f7f4]">
              <MediaPreview src={images[0]?.src} alt="" imgClassName="transition duration-300 ease-out group-hover:scale-[1.025]" />
            </span>
            {images.slice(1, 3).map((image, index) => (
              <span className="grid aspect-[4/3] place-items-center overflow-hidden rounded-md border border-[#d6e0d8] bg-[#f4f7f4]" key={`${image.src}-${index}`}>
                <MediaPreview src={image.src} alt="" imgClassName="transition duration-300 ease-out group-hover:scale-[1.025]" />
              </span>
            ))}
          </>
        ) : (
          <>
            <AlbumPlaceholder name={name} className="row-span-2 aspect-[4/3]" title={name} label="Album cover" />
            <AlbumPlaceholder name={`${name}-shelf`} className="aspect-[4/3]" title="Album" label="Preview" />
            <AlbumPlaceholder name={`${name}-stable`} className="aspect-[4/3]" title="Media" label="Preview" />
          </>
        )}
      </div>
      <div className="pointer-events-none relative z-[2] grid min-w-0 content-between gap-4 py-1">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-[.08em] text-tjc-muted">{ministry}</span>
              <h2 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-tjc-ink">{name}</h2>
            </div>
            <TjcStatusBadge domain="reuse" status={statusLabel} tone={statusTone} icon={hasPeopleWarning ? Users : hasAssets ? CheckCircle2 : FolderOpen} label={statusLabel} size="xs" />
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-tjc-muted">{description}</p>
          <div className="grid gap-1 rounded-md border border-[#dbe4dd] bg-[#fbfcfa] p-2 text-xs font-semibold text-[#4d5b52]">
            <span><strong className="text-tjc-ink">Best use:</strong> {bestUse}</span>
            <span><strong className="text-tjc-ink">Safety:</strong> {safetySummary}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black text-[#4d5b52]">
            <span className="inline-flex min-h-8 max-w-full min-w-0 items-center gap-1.5 rounded-md border border-[#dbe4dd] bg-[#f9fbf9] px-2">
              <Images size={13} strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate">{countLabel}</span>
            </span>
            <span className="inline-flex min-h-8 max-w-full min-w-0 items-center gap-1.5 rounded-md border border-[#dbe4dd] bg-[#f9fbf9] px-2">
              <CheckCircle2 size={13} strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate">{approvalSummary}</span>
            </span>
            <span className="inline-flex min-h-8 max-w-full min-w-0 items-center gap-1.5 rounded-md border border-[#dbe4dd] bg-[#f9fbf9] px-2">
              <CalendarDays size={13} strokeWidth={1.8} aria-hidden="true" />
              <span className="truncate">{dateRange}</span>
            </span>
          </div>
          {peopleWarning ? (
          <span className="inline-flex items-center gap-1 text-xs font-black text-[#725216]">
            <Users size={13} strokeWidth={1.8} aria-hidden="true" />
            {peopleWarning}
          </span>
        ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6eee8] pt-3">
          <span className="text-xs font-black text-tjc-muted">
            {hasAssets ? "Open album to review media before reuse." : "No assets yet."}
          </span>
          <div className="flex flex-wrap gap-2">
            {onInspect ? (
              <button className="pointer-events-auto inline-flex min-h-9 items-center rounded-md border border-[#c9d8cf] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1] active:translate-y-px" type="button" onClick={onInspect}>
                {inspectLabel}
              </button>
            ) : null}
            {hasAssets ? <button className="pointer-events-auto inline-flex min-h-9 items-center gap-2 rounded-md border border-[#c9d8cf] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1] active:translate-y-px" type="button" onClick={onOpen}>
              Open album
              <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
            </button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
