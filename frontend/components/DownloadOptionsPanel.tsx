"use client";

import { useState } from "react";
import { Download, FileLock2, Mail, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { GatedDownloadButton } from "@/components/GatedDownloadButton";
import { ReuseRequestDialog } from "@/components/ReuseRequestDialog";
import { buildDownloadCenterModel, type DownloadCenterRowStatus } from "@/lib/download-center";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";

type RequestKind = "original" | "review";

function actionLabel(status: DownloadCenterRowStatus, hasDownload: boolean) {
  if (hasDownload) return "Download";
  if (status === "ready") return "Available";
  if (status === "restricted") return "Restricted";
  return "Request";
}

function rowBadge(status: DownloadCenterRowStatus) {
  if (status === "ready") return "Available";
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
  const primaryDownload = model.rows.find((row) => row.downloadHref);

  return (
    <>
      <section className="grid gap-5" aria-label="Download Center">
        <section className="rounded-[14px] border border-[#dfe7d8] bg-[#f2f8ed] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#2f6b34]">
              <FileLock2 size={17} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[15px] font-black leading-tight text-[#151514]">{model.originalAccess.label}</h3>
              <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-[#53614f]">{model.originalAccess.detail}</p>
              <button
                className="mt-2 inline-flex min-h-8 items-center gap-2 rounded-[8px] border border-transparent bg-transparent px-0 text-[12.5px] font-black text-[#151514] transition hover:text-[#2f6b34]"
                type="button"
                onClick={() => setRequestKind("original")}
              >
                Request elevated access
                <Mail size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-black text-[#151514]">Select renditions</h3>
              <p className="mt-1 text-[12px] font-semibold text-[#716b62]">Rows reflect current backend truth; unavailable formats stay request-only.</p>
            </div>
            <span className="shrink-0 text-[12px] font-bold text-[#716b62]">{model.rows.filter((row) => row.status === "ready").length} available</span>
          </div>
          {model.rows.map((row) => {
            return (
              <article className={cn("grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-3 rounded-[12px] border border-[#e7e1d7] bg-white px-3 py-3", row.status !== "ready" && "bg-[#f8f4ed]")} key={row.id}>
                <span className={cn("mt-0.5 grid h-[18px] w-[18px] place-items-center rounded-[5px] border text-white", row.status === "ready" ? "border-[#2f6b34] bg-[#2f6b34]" : "border-[#d8d0c5] bg-[#f8f4ed] text-[#716b62]")}>
                  {row.status === "ready" ? <ShieldCheck size={12} aria-hidden="true" /> : row.status === "restricted" ? <FileLock2 size={12} aria-hidden="true" /> : null}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong className="text-[13px] font-black leading-tight text-[#151514]">{row.label}</strong>
                    {row.status === "restricted" ? <FileLock2 size={13} aria-hidden="true" className="text-[#716b62]" /> : null}
                    <span className="rounded-[6px] bg-[#f0ede7] px-2 py-0.5 text-[10px] font-black text-[#716b62]">
                      {rowBadge(row.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#716b62]">
                    {[row.fileType, row.dimensions, row.fileSize].filter(Boolean).join(" · ") || row.intendedUse}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-[#8a837a]">{row.detail}</p>
                </div>
                {row.downloadHref ? (
                  <GatedDownloadButton
                    className="inline-flex min-h-8 items-center justify-center gap-2 rounded-[8px] bg-[#151514] px-3 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    href={row.downloadHref}
                    reason={`Download Center ${row.label} request for ${assetTitle}`}
                    usageChannel="download-center"
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </GatedDownloadButton>
                ) : row.routeBoundary === "approved-copy-gate" ? (
                  <button
                    className="inline-flex min-h-8 items-center justify-center gap-2 rounded-[8px] border border-[#d8d0c5] bg-white px-3 text-[12px] font-black text-[#716b62] transition hover:bg-[#fffefa]"
                    type="button"
                    onClick={() => setRequestKind("review")}
                  >
                    Request
                  </button>
                ) : (
                  <span className="rounded-[8px] bg-[#f0ede7] px-3 py-2 text-[12px] font-black text-[#716b62]">
                    {actionLabel(row.status, false)}
                  </span>
                )}
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 border-t border-[#e7e1d7] pt-1">
          <div className="grid gap-2">
            {model.addons.map((addon) => (
              <article className="flex items-center justify-between gap-3" key={addon.id}>
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-[17px] w-[17px] place-items-center rounded-[4px] border text-white", addon.status === "available" ? "border-[#2f6b34] bg-[#2f6b34]" : "border-[#d8d0c5] bg-white")}><ShieldCheck size={11} aria-hidden="true" /></span>
                  <strong className="text-[12.5px] font-black text-[#151514]">{addon.label}</strong>
                </div>
                <span className={cn("h-6 w-10 rounded-full p-0.5", addon.status === "available" ? "bg-[#2f6b34]" : "bg-[#d8d0c5]")} aria-label={`${addon.label}: ${addon.status}`}>
                  <span className={cn("block h-5 w-5 rounded-full bg-white transition", addon.status === "available" && "translate-x-4")} />
                </span>
              </article>
            ))}
          </div>
        </section>

        {primaryDownload ? (
          <GatedDownloadButton
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-[#111111] px-4 text-[14px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            href={primaryDownload.downloadHref || ""}
            reason={`Download Center approved-copy request for ${assetTitle}`}
            usageChannel="download-center"
          >
            <Download size={16} aria-hidden="true" />
            Download approved copy
          </GatedDownloadButton>
        ) : (
          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-[#111111] px-4 text-[14px] font-black text-white"
            type="button"
            onClick={() => setRequestKind("review")}
          >
            <Mail size={16} aria-hidden="true" />
            Request approved copy
          </button>
        )}

        <p className="text-center text-[12px] font-semibold text-[#8a837a]">
          Downloads are logged and monitored.
        </p>
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
