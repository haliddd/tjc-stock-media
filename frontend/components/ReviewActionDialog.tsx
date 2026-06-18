"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";

type ReviewActionDialogProps = {
  open: boolean;
  actionLabel: string;
  requestedStatus: string;
  assetTitle: string;
  resourceSpaceId: string;
  rawStatus: string;
  portalReuseState: string;
  blockers: string[];
  checklistSummary: string[];
  reviewEvidence?: string[];
  note: string;
  sourceReadOnly: boolean;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReviewActionDialog({
  open,
  actionLabel,
  requestedStatus,
  assetTitle,
  resourceSpaceId,
  rawStatus,
  portalReuseState,
  blockers,
  checklistSummary,
  reviewEvidence = [],
  note,
  sourceReadOnly,
  submitting,
  onCancel,
  onConfirm
}: ReviewActionDialogProps) {
  return (
    <Dialog
      open={open}
      title={actionLabel}
      description="Queue a reviewed decision for media-team follow-up. This does not publish or finalize the record."
      onClose={onCancel}
      maxWidthClassName="max-w-2xl"
      tone="warning"
      footer={(
        <>
          <button className="inline-flex min-h-10 items-center rounded-xl border border-tjc-line bg-white px-4 text-sm font-semibold text-tjc-evergreen transition hover:bg-[#eef7f1]" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 dam-button-primary px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            <ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />
            {submitting ? "Queueing..." : "Queue decision"}
          </button>
        </>
      )}
    >
      <div className="grid gap-3">
        <div className="grid gap-2 rounded-xl border border-tjc-line bg-[#fbfcfa] p-3 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold text-tjc-muted">Asset</span>
            <strong className="mt-1 block text-sm text-tjc-ink">{assetTitle}</strong>
            <span className="mt-1 block text-xs font-semibold text-tjc-muted">Reference code {resourceSpaceId}</span>
          </div>
          <div>
            <span className="text-xs font-semibold text-tjc-muted">Status change requested</span>
            <strong className="mt-1 block text-sm text-tjc-ink">{rawStatus} {"->"} {requestedStatus}</strong>
            <span className="mt-1 block text-xs font-semibold text-tjc-muted">{portalReuseState}</span>
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-[#ead6a8] bg-[#fff8e8] p-3 text-[#725216]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={17} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm">Queued, not final library status</strong>
              <p className="mt-1 text-sm leading-relaxed">
                {sourceReadOnly
                  ? "This action creates an audit record for media-team follow-up. Approval is not final here."
                  : "This action goes through the review route and preserves audit fields."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <section className="dam-card p-3" aria-label="Evidence checklist summary">
            <h3 className="text-sm font-semibold text-tjc-evergreen">Evidence confirmed</h3>
            <ul className="mt-2 grid gap-1.5 text-sm text-[#4d554d]">
              {[...checklistSummary, ...reviewEvidence].map((item) => (
                <li className="flex gap-2" key={item}>
                  <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-tjc-evergreen" />
                  <span>{item}</span>
                </li>
              ))}
              {!checklistSummary.length && !reviewEvidence.length ? (
                <li className="text-sm font-semibold text-[#725216]">No approval evidence captured yet.</li>
              ) : null}
            </ul>
          </section>
          <section className="dam-card p-3" aria-label="Current blockers">
            <h3 className="text-sm font-semibold text-tjc-evergreen">Current blockers</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blockers.length ? (
                blockers.slice(0, 8).map((blocker) => (
                  <span className="rounded-md border border-[#ead6a8] bg-[#fff8e8] px-2 py-1 text-xs font-semibold text-[#725216]" key={blocker}>{blocker}</span>
                ))
              ) : (
                <span className="rounded-md border border-[#b8d9c6] bg-[#edf8f1] px-2 py-1 text-xs font-semibold text-[#22563a]">No current blockers</span>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-tjc-line bg-[#fbfcfa] p-3" aria-label="Review note preview">
          <h3 className="text-sm font-semibold text-tjc-evergreen">Review note</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#4d554d]">{note}</p>
        </section>
      </div>
    </Dialog>
  );
}
