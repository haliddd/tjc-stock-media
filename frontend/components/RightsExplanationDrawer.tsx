"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { buildRightsSafeExplanation } from "@/lib/rights-safe-explanation";
import type { DemoRole, StockMediaAsset } from "@/lib/types";
import { cn } from "@/lib/ui";

function criterionTone(state: "pass" | "review" | "info") {
  if (state === "pass") return "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]";
  if (state === "review") return "border-[#ead6a8] bg-[#fff8e8] text-[#725216]";
  return "border-[#c8d7e6] bg-[#f2f7fb] text-[#27435b]";
}

export function RightsExplanationDrawer({
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
  const model = buildRightsSafeExplanation(asset, role);

  return (
    <Dialog
      open={open}
      title="Why can I use this?"
      description={description || "Role-safe explanation of approval, rights, release, channels, expiration, and role permission for this record."}
      onClose={onClose}
      placement="right"
      maxWidthClassName="max-w-[34rem]"
      closeLabel="Close rights explanation"
      tone={model.reusable ? "success" : "warning"}
    >
      <div className="grid gap-4">
        <section className={cn("rounded-[10px] border p-4", model.reusable ? "border-[#b8d9c6] bg-[#edf8f1]" : "border-[#ead6a8] bg-[#fff8e8]")}>
          <div className="flex items-start gap-3">
            {model.reusable ? <ShieldCheck size={18} aria-hidden="true" className="mt-0.5 text-[#22563a]" /> : <ShieldAlert size={18} aria-hidden="true" className="mt-0.5 text-[#725216]" />}
            <div>
              <h2 className="text-base font-black text-tjc-ink">{model.title}</h2>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-tjc-muted">{model.summary}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <div>
            <h3 className="text-base font-black text-tjc-ink">Decision checks</h3>
            <p className="mt-1 text-sm font-semibold text-tjc-muted">Only exported fields and the current backend reuse decision are used here.</p>
          </div>
          <div className="grid gap-2">
            {model.criteria.map((criterion) => (
              <article className={cn("grid gap-1 rounded-[10px] border px-3 py-3", criterionTone(criterion.state))} key={criterion.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm font-black">{criterion.label}</strong>
                  <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#596052]">
                    {criterion.state === "pass" ? "Pass" : criterion.state === "review" ? "Needs review" : "Info"}
                  </span>
                </div>
                <p className="text-sm font-semibold text-tjc-ink">{criterion.value}</p>
                <p className="text-sm font-semibold leading-relaxed">{criterion.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-[10px] border border-[#d9dee3] bg-white p-4">
          <div>
            <h3 className="text-base font-black text-tjc-ink">{model.blockers.length ? "Blocked reasons" : "Current blocker state"}</h3>
            <p className="mt-1 text-sm font-semibold text-tjc-muted">Blocked reasons are safe summaries only. No private paths, raw IDs, or source internals are exposed here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {model.blockers.length ? model.blockers.map((blocker) => (
              <span className="rounded-[8px] border border-[#ead6a8] bg-[#fff8e8] px-2.5 py-1.5 text-xs font-black text-[#725216]" key={blocker}>
                {blocker}
              </span>
            )) : (
              <span className="rounded-[8px] border border-[#b8d9c6] bg-[#edf8f1] px-2.5 py-1.5 text-xs font-black text-[#22563a]">
                No active blockers exported for this role.
              </span>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
