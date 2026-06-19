"use client";

import { ArrowRight, CheckCircle2, Circle, type LucideIcon } from "lucide-react";
import { UploadFileDropzone } from "@/components/UploadFileDropzone";
import { UploadIntakePacket } from "@/components/UploadIntakePacket";
import { cn } from "@/lib/ui";
import type { ReactNode } from "react";

type PrimaryActionProps = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  tone?: "primary" | "secondary" | "quiet" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
};

export function PrimaryAction({
  href,
  onClick,
  children,
  icon: Icon,
  tone = "primary",
  className,
  disabled,
  type = "button"
}: PrimaryActionProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-55",
    tone === "primary" && "bg-tjc-evergreen text-white shadow-[0_12px_26px_rgba(15,61,46,.18)] hover:bg-[#082f29]",
    tone === "secondary" && "border border-[#b9c9bf] bg-white text-tjc-evergreen hover:bg-[#eef7f1]",
    tone === "quiet" && "bg-transparent text-tjc-evergreen hover:bg-[#edf4ef]",
    tone === "danger" && "bg-[#7d2d2a] text-white hover:bg-[#642320]",
    className
  );
  const content = (
    <>
      {Icon ? <Icon size={16} strokeWidth={1.9} aria-hidden="true" /> : null}
      <span>{children}</span>
    </>
  );
  if (href && !disabled) return <a className={classes} href={href}>{content}</a>;
  return (
    <button
      className={classes}
      type={type}
      onClick={(event) => {
        if (type !== "submit") event.preventDefault();
        onClick?.();
      }}
      disabled={disabled}
    >
      {content}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  primary
}: {
  title: string;
  description: string;
  primary?: ReactNode;
}) {
  return (
    <section className="dam-v2-form-empty grid gap-4 rounded-2xl border border-[#c9d8cf] bg-[#f8fbf8] p-5">
      <div>
        <span className="text-xs font-black uppercase tracking-[.08em] text-tjc-evergreen">Send media</span>
        <h1 className="mt-2 text-3xl font-black leading-tight text-tjc-ink">{title}</h1>
        <p className="mt-2 max-w-[62ch] text-sm font-semibold leading-relaxed text-tjc-muted">{description}</p>
      </div>
      {primary ? <div>{primary}</div> : null}
    </section>
  );
}

export function UseCaseCard({
  label,
  detail,
  icon: Icon,
  onClick,
  selected = false
}: {
  label: string;
  detail: string;
  icon: LucideIcon;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <button
      className={cn(
        "dam-packet-category group grid min-h-20 grid-cols-[auto_1fr_auto] items-start gap-3 rounded-2xl border border-[#d6dfd8] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#8fb2a5] hover:bg-[#f5faf7] active:translate-y-px",
        selected && "is-selected"
      )}
      type="button"
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef7f1] text-tjc-evergreen">
        <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <strong className="block text-lg font-black leading-tight text-tjc-ink">{label}</strong>
        <span className="mt-1 block text-sm font-semibold leading-snug text-tjc-muted">{detail}</span>
      </span>
      <ArrowRight className="mt-1 text-[#7d8a82] transition group-hover:translate-x-0.5 group-hover:text-tjc-evergreen" size={16} strokeWidth={1.9} aria-hidden="true" />
    </button>
  );
}

export function EvidenceChecklist({
  items,
  onToggle
}: {
  items: Array<{ id: string; label: string; complete: boolean }>;
  onToggle?: (id: string) => void;
}) {
  return (
    <div className="dam-packet-checklist grid gap-2" aria-label="Evidence checklist">
      {items.map((item) => (
        <button
          type="button"
          className={cn("grid min-h-12 grid-cols-[auto_1fr] items-center gap-3 rounded-xl border px-3 text-left text-sm font-black transition", item.complete ? "border-[#b9d8c6] bg-[#eef8f2] text-[#194f34]" : "border-[#d8e1da] bg-white text-[#3f4a43] hover:bg-[#f8faf8]")}
          onClick={() => onToggle?.(item.id)}
          key={item.id}
        >
          {item.complete ? <CheckCircle2 size={18} strokeWidth={1.9} aria-hidden="true" /> : <Circle size={18} strokeWidth={1.9} aria-hidden="true" />}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export function PacketStepper({
  steps,
  current
}: {
  steps: readonly string[];
  current: number;
}) {
  const stageLabels = ["Type", "Source", "People", "Files", "Review"];
  return (
    <section className="dam-packet-stepper rounded-2xl border border-[#d6dfd8] bg-white p-4" aria-label="Send progress">
      <div className="dam-packet-stepper-head flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black text-tjc-evergreen">Step {current + 1} of {steps.length}</span>
          <h2 className="mt-1 text-2xl font-black leading-tight text-tjc-ink">{steps[current]}</h2>
        </div>
        <span className="dam-packet-step-now rounded-xl bg-[#eef7f1] px-3 py-1 text-xs font-black tabular-nums text-tjc-evergreen">{stageLabels[current] || current + 1}</span>
      </div>
      <div className="dam-packet-progress-track mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {steps.map((item, index) => (
          <span className={cn("h-2 rounded-full", index <= current ? "bg-tjc-evergreen" : "bg-[#dbe4dd]")} key={item} />
        ))}
      </div>
      <ol className="dam-packet-step-list mt-3 grid gap-2">
        {steps.map((item, index) => (
          <li className={cn("dam-packet-step-item grid grid-cols-[auto_1fr] items-center gap-2", index === current && "is-current", index < current && "is-complete")} key={item}>
            <span className="dam-packet-step-index tabular-nums">{index + 1}</span>
            <span className="truncate" title={item}>{stageLabels[index] || item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PacketSubmitBar({ children }: { children: ReactNode }) {
  return (
    <section className="dam-packet-submit-bar grid gap-3 rounded-2xl border border-[#d6dfd8] bg-white p-4" aria-label="Send actions">
      {children}
    </section>
  );
}

export function PacketRequirementPanel({
  typeLabel,
  items
}: {
  typeLabel: string;
  items: Array<{ label: string; detail: string }>;
}) {
  return (
    <section className="dam-packet-requirements" aria-label="Reviewer packet requirements">
      <div>
        <span>Reviewer packet needs</span>
        <h3>{typeLabel}</h3>
        <p>Reviewers need enough context to decide reuse. Sending media here does not publish it.</p>
      </div>
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            <span>{index + 1}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PacketSummary({
  typeLabel,
  fileCount,
  hasSourceLink,
  tagCount,
  ready,
  children
}: {
  typeLabel: string;
  fileCount: number;
  hasSourceLink: boolean;
  tagCount: number;
  ready: boolean;
  children?: ReactNode;
}) {
  return (
    <aside className={cn("dam-packet-summary grid h-fit gap-4 rounded-2xl border border-[#cbd8cf] bg-[#fbfcfa] p-4 lg:sticky lg:top-[calc(var(--app-header-height)+1rem)]", ready && "is-ready")} aria-label="Reviewer packet summary">
      <div>
        <span className="text-xs font-black uppercase tracking-[.08em] text-tjc-evergreen">Reviewer packet</span>
        <h2 className="mt-1 text-2xl font-black leading-tight text-tjc-ink">{ready ? "Ready to send for review" : "Context still needed"}</h2>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-tjc-muted">
          Reviewers get one packet with source, rights, people, use case, and notes.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {[
          { label: "Type", value: typeLabel, complete: true },
          { label: "Files", value: String(fileCount), complete: fileCount > 0 },
          { label: "Source link", value: hasSourceLink ? "Included" : "Needed if no file", complete: hasSourceLink || fileCount > 0 },
          { label: "Tags", value: String(tagCount), complete: true }
        ].map(({ label, value, complete }) => (
          <div className={cn("dam-packet-summary-stat rounded-xl border border-[#d8e1da] bg-white p-3", complete ? "is-complete" : "is-needed")} key={label}>
            <dt className="text-[11px] font-black uppercase tracking-[.06em] text-tjc-muted">{label}</dt>
            <dd className="mt-1 text-sm font-black text-tjc-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="dam-packet-ledger grid gap-2" aria-label="Packet handling">
        {[
          ["Intake", "Submitted media enters review."],
          ["Decision", "Reviewer evidence controls reuse."],
          ["Publish", "No automatic publishing."]
        ].map(([label, value]) => (
          <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-[#e7ece8] pt-2 first:border-t-0 first:pt-0" key={label}>
            <strong className="text-xs font-black text-tjc-evergreen">{label}</strong>
            <span className="text-xs font-semibold leading-relaxed text-tjc-muted">{value}</span>
          </div>
        ))}
      </section>
      {children}
    </aside>
  );
}

export { UploadFileDropzone as DamUploadFileDropzone };
export { UploadIntakePacket as DamUploadIntakePacket };
export { EmptyState as DamFormEmptyState };
export { EvidenceChecklist as DamFormEvidenceChecklist };
export { PrimaryAction as DamFormPrimaryAction };
export { UseCaseCard as DamFormUseCaseCard };
export { PacketRequirementPanel as DamPacketRequirementPanel };
export { PacketStepper as DamPacketStepper };
export { PacketSummary as DamPacketSummary };
export { PacketSubmitBar as DamPacketSubmitBar };
