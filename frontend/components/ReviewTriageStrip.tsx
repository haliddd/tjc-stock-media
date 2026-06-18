"use client";

import { MediaPreview } from "@/components/MediaPreview";
import { assetPresentation } from "@/lib/presentation";
import { reviewRiskFlags } from "@/lib/workflow-policy";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";

type ReviewTriageStripProps = {
  assets: StockMediaAsset[];
  role: DemoRole;
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function ReviewTriageStrip({ assets, role, selectedId, onSelect }: ReviewTriageStripProps) {
  const stripAssets = assets.slice(0, 12);
  if (!stripAssets.length) return null;

  return (
    <section className="mt-4 hidden overflow-hidden rounded-lg border border-[#cfd7d1] bg-white p-3 md:block" aria-label="Visual triage strip">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <div>
          <span className="text-xs font-black uppercase tracking-[.06em] text-tjc-muted">Visual triage</span>
          <h2 className="text-lg font-black text-tjc-ink">Scan risk before opening records</h2>
        </div>
        <span className="hidden rounded-md border border-[#d6dfd8] bg-[#f7faf7] px-3 py-1 text-xs font-black text-tjc-muted sm:inline-flex">
          First {stripAssets.length} loaded
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {stripAssets.map((asset) => {
          const display = assetPresentation(asset, role);
          const risks = reviewRiskFlags(asset).slice(0, 3);
          const selected = asset.id === selectedId;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelect(asset.id)}
              aria-pressed={selected}
              className={cn(
                "group grid min-w-0 gap-2 rounded-md border p-2 text-left transition hover:bg-[#f8fbf8]",
                selected ? "border-[#0b4b42] bg-[#e8f2ed] ring-1 ring-inset ring-[#0b4b42]" : "border-[#d6dfd8] bg-white"
              )}
            >
              <span className="block aspect-[4/3] overflow-hidden rounded-md bg-[#eef1ed]">
                <MediaPreview src={display.image} alt={asset.thumbnailAlt} imgClassName="transition duration-300 group-hover:scale-[1.035]" className="px-2" loading="eager" />
              </span>
              <span className="line-clamp-1 text-sm font-black text-tjc-ink">{display.title}</span>
              <span className="flex min-h-7 flex-wrap gap-1 overflow-hidden">
                {risks.map((risk) => (
                  <span className="line-clamp-1 rounded-md border border-[#ead6a8] bg-[#fff8e8] px-2 py-1 text-[11px] font-black text-[#684a10]" key={risk}>{risk}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
