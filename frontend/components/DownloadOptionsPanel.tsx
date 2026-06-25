"use client";

import { useState } from "react";
import { Download, FileLock2, FileText, Mail, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { GatedDownloadButton } from "@/components/GatedDownloadButton";
import { ReuseRequestDialog } from "@/components/ReuseRequestDialog";
import { buildDownloadCenterModel, type DownloadCenterAddonStatus, type DownloadCenterRowStatus } from "@/lib/download-center";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";

type RequestKind = "original" | "review";

function rowTone(status: DownloadCenterRowStatus) {
  if (status === "ready") return "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]";
  if (status === "restricted") return "border-[#e5b7b5] bg-[#fff1ef] text-[#7d2d2a]";
  return "border-[#ead6a8] bg-[#fff8e8] text-[#725216]";
}

function addonTone(status: DownloadCenterAddonStatus) {
  return status === "available"
    ? "border-[#c8d7e6] bg-[#f2f7fb] text-[#27435b]"
    : "border-[#ead6a8] bg-[#fff8e8] text-[#725216]";
}

function actionLabel(status: DownloadCenterRowStatus, hasDownload: boolean) {
  if (hasDownload) return "Download";
  if (status === "restricted") return "Restricted";
  return "Request";
}

export function DownloadOptionsPanel({ asset, role }: { asset: StockMediaAsset; role: DemoRole }) {
  const [requestKind, setRequestKind] = useState<RequestKind | null>(null);
  const model = buildDownloadCenterModel(asset, role);
  const opsView = role === "Reviewer" || role === "DAM Admin";
  const adminOps = role === "DAM Admin";
  const referenceCode = adminOps ? asset.resourceSpaceId || asset.id : asset.id;
  const assetTitle = asset.title || asset.id;

  return (
    <>
      <section className="grid gap-4" aria-label="Download Center">
        <section className="rounded-[10px] border border-[#d9dee3] bg-white p-4">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#6d7265]">Controlled delivery</span>
          <h2 className="mt-1 text-xl font-black text-tjc-ink">{model.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-tjc-muted">{model.summary}</p>
          <div className="mt-3 rounded-[8px] border border-[#d9dee3] bg-[#fbfcfa] px-3 py-2 text-sm font-semibold text-[#546056]">
            {model.truthNote}
          </div>
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="text-base font-black text-tjc-ink">Approved downloads and renditions</h3>
            <p className="mt-1 text-sm font-semibold text-tjc-muted">Only rows backed by current export, derivative, or gate truth appear as ready.</p>
          </div>
          {model.rows.map((row) => {
            const facts = [
              { label: "Permission", value: row.permissionState },
              { label: "Intended use", value: row.intendedUse },
              row.fileType ? { label: "File type", value: row.fileType } : null,
              row.dimensions ? { label: "Dimensions", value: row.dimensions } : null,
              row.fileSize ? { label: "File size", value: row.fileSize } : null
            ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

            return (
              <article className={cn("grid gap-3 rounded-[10px] border p-4", rowTone(row.status))} key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base font-black">{row.label}</strong>
                      <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#5a655b]">
                        {row.routeBoundary === "approved-copy-gate" ? "Gate-backed" : row.routeBoundary === "thumbnail-preview" ? "Preview" : "Request-only"}
                      </span>
                    </div>
                    <p className="mt-1 max-w-[64ch] text-sm font-semibold leading-relaxed">{row.detail}</p>
                  </div>
                  <span className="rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-black">
                    {actionLabel(row.status, Boolean(row.downloadHref))}
                  </span>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {facts.map((fact) => (
                    <div className="rounded-[8px] border border-white/70 bg-white/80 px-3 py-2" key={`${row.id}-${fact.label}`}>
                      <dt className="text-[11px] font-black uppercase tracking-[0.08em] text-[#68756d]">{fact.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-tjc-ink">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
                {row.downloadHref ? (
                  <GatedDownloadButton
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#151713] px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    href={row.downloadHref}
                    reason={`Download Center ${row.label} request for ${assetTitle}`}
                    usageChannel="download-center"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download
                  </GatedDownloadButton>
                ) : row.routeBoundary === "approved-copy-gate" ? (
                  <button
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-[#c5d1c9] bg-white px-3 text-sm font-black text-tjc-evergreen transition hover:bg-[#eef7f1]"
                    type="button"
                    onClick={() => setRequestKind("review")}
                  >
                    <Mail size={16} aria-hidden="true" />
                    Request export or review
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 rounded-[10px] border border-[#ead6a8] bg-[#fff8e8] p-4">
          <div className="flex items-start gap-3">
            <FileLock2 size={18} aria-hidden="true" className="mt-0.5 text-[#725216]" />
            <div>
              <h3 className="text-base font-black text-tjc-ink">{model.originalAccess.label}</h3>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#725216]">{model.originalAccess.detail}</p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-[#d6c18e] bg-white px-3 text-sm font-black text-[#725216] transition hover:bg-[#fffdf8]"
            type="button"
            onClick={() => setRequestKind("original")}
          >
            <Mail size={16} aria-hidden="true" />
            Request source-file access
          </button>
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="text-base font-black text-tjc-ink">Add-ons and supporting notes</h3>
            <p className="mt-1 text-sm font-semibold text-tjc-muted">Only backed notes show as available. Everything else stays request-needed.</p>
          </div>
          <div className="grid gap-2">
            {model.addons.map((addon) => (
              <article className={cn("grid gap-1 rounded-[10px] border px-3 py-3", addonTone(addon.status))} key={addon.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black">{addon.label}</strong>
                  <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#596052]">
                    {addon.status === "available" ? "Available" : "Request needed"}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-relaxed">{addon.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      {requestKind ? (
        <ReuseRequestDialog
          open={Boolean(requestKind)}
          kind={requestKind}
          assetTitle={assetTitle}
          resourceSpaceId={String(referenceCode)}
          rawStatus={asset.status}
          portalReuseState={asset.reuseDecision?.label || asset.status}
          blockers={(asset.reuseDecision?.blockers || []).map((blocker) => blocker.label)}
          mailtoHref={requestKind === "original" ? model.originalAccess.requestHref : model.reviewRequestHref}
          opsView={opsView}
          adminOps={adminOps}
          onCancel={() => setRequestKind(null)}
        />
      ) : null}
    </>
  );
}

export function DownloadCenterDrawer({
  open,
  onClose,
  asset,
  role,
  description
}: {
  open: boolean;
  onClose: () => void;
  asset: StockMediaAsset;
  role: DemoRole;
  description?: string;
}) {
  return (
    <Dialog
      open={open}
      title="Download Center"
      description={description || "Approved downloads, rendition truth, source-file separation, and request-needed states for this record."}
      onClose={onClose}
      placement="right"
      maxWidthClassName="max-w-[34rem]"
      closeLabel="Close Download Center"
    >
      <DownloadOptionsPanel asset={asset} role={role} />
    </Dialog>
  );
}
