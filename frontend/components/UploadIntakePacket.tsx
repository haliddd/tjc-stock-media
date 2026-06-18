"use client";

import { CheckCircle2, Clock3, FileCheck2, FileWarning, FolderInput, ShieldCheck, Tags } from "lucide-react";
import { parseUploadTags } from "@/lib/upload-tags";
import { LARGE_MEDIA_BYTES, uploadBetaBoundaries, uploadDefaultState } from "@/lib/workflow-policy";
import { cn } from "@/lib/ui";

type UploadIntakePacketProps = {
  selectedFiles: File[];
  suggestedTags: string;
  hasSourceLink?: boolean;
  largeWarning?: string;
  opsView?: boolean;
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
}

export function UploadIntakePacket({ selectedFiles, suggestedTags, hasSourceLink = false, largeWarning, opsView = false }: UploadIntakePacketProps) {
  const tags = parseUploadTags(suggestedTags);
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const hasLargeFile = selectedFiles.some((file) => file.size > LARGE_MEDIA_BYTES);
  const checklist = [
    { label: "Context", detail: "Title, event, date, ministry, source", complete: true },
    { label: "People and rights", detail: "Required fields block unknown public reuse", complete: true },
    { label: "Files", detail: selectedFiles.length ? `${selectedFiles.length} selected / ${formatBytes(totalBytes)}` : hasSourceLink ? "Source link captured" : "File or source link required", complete: selectedFiles.length > 0 || hasSourceLink },
    { label: "Tags", detail: tags.length ? `${tags.length} taxonomy term${tags.length === 1 ? "" : "s"}` : "Choose taxonomy terms", complete: tags.length > 0 }
  ];

  return (
    <section className="dam-contact-sheet overflow-hidden p-4" aria-label="Reviewer handoff packet">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-[.08em] text-tjc-evergreen">Reviewer packet</span>
          <h2 className="mt-1 text-xl font-black text-tjc-ink">Ready for intake review</h2>
          <p className="mt-1 max-w-[62ch] text-sm font-semibold leading-relaxed text-tjc-muted">
            {opsView
              ? "This packet summarizes what reviewers receive. It does not approve, publish, or finalize library metadata."
              : "This packet summarizes what reviewers receive. It does not approve or publish media."}
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#dfbd73] bg-[#fff8e8] px-3 text-xs font-black text-[#725216]">
          <Clock3 size={14} strokeWidth={1.9} aria-hidden="true" />
          {uploadDefaultState.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.55fr)]">
        <div className="grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div
              className={cn(
                "grid grid-cols-[auto_1fr] gap-3 rounded-md border p-3",
                item.complete ? "border-[#b8d9c6] bg-[#edf8f1] text-[#22563a]" : "border-[#ead6a8] bg-[#fff8e8] text-[#725216]"
              )}
              key={item.label}
            >
              {item.complete ? <CheckCircle2 size={18} strokeWidth={1.9} aria-hidden="true" /> : <FileWarning size={18} strokeWidth={1.9} aria-hidden="true" />}
              <span>
                <strong className="block text-sm font-black">{item.label}</strong>
                <span className="mt-1 block text-xs font-semibold leading-snug text-current/75">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-[#c8d7e6] bg-[#f2f7fb] p-3 text-[#27435b]">
            <FolderInput size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong className="block text-sm font-black">Persistence mode</strong>
              <span className="mt-1 block text-xs font-semibold leading-snug text-current/75">
                {opsView ? "Server-routed intake only. Final library updates happen through media-team review." : "Send-for-review only. A reviewer must approve media before anyone can reuse it."}
              </span>
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-[#ead6a8] bg-[#fff8e8] p-3 text-[#725216]">
            <FileWarning size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong className="block text-sm font-black">Beta boundary</strong>
              <span className="mt-1 block text-xs font-semibold leading-snug text-current/75">{uploadBetaBoundaries.forbidden[0]}</span>
            </span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-3 rounded-md border border-[#b8d9c6] bg-white p-3 text-tjc-evergreen">
            <ShieldCheck size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong className="block text-sm font-black">Reuse safety</strong>
              <span className="mt-1 block text-xs font-semibold leading-snug text-tjc-muted">All submissions remain blocked until reviewer approval.</span>
            </span>
          </div>
        </div>
      </div>

      {selectedFiles.length ? (
        <div className="mt-4 grid gap-2" aria-label="Selected files packet summary">
          <div className="flex flex-wrap items-center gap-2 text-sm font-black text-tjc-ink">
            <FileCheck2 size={16} strokeWidth={1.9} aria-hidden="true" />
            Selected files
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {selectedFiles.slice(0, 6).map((file, index) => {
              const tooLarge = file.size > LARGE_MEDIA_BYTES;
              return (
                <div className={cn("rounded-md border px-3 py-2 text-xs font-semibold", tooLarge ? "border-[#ead6a8] bg-[#fff8e8] text-[#725216]" : "border-tjc-line bg-white text-[#4d554d]")} key={`${file.name}-${file.size}-${index}`}>
                  <span className="block truncate font-black">{file.name}</span>
                  <span className="mt-1 block truncate text-current/72">{file.type || "unknown type"} / {formatBytes(file.size)}</span>
                </div>
              );
            })}
          </div>
          {selectedFiles.length > 6 ? <span className="text-xs font-semibold text-tjc-muted">+ {selectedFiles.length - 6} more selected files</span> : null}
        </div>
      ) : null}

      {tags.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Selected tag packet summary">
          <span className="inline-flex items-center gap-1 text-sm font-black text-tjc-ink">
            <Tags size={15} strokeWidth={1.9} aria-hidden="true" />
            Tags
          </span>
          {tags.slice(0, 10).map((tag, index) => (
            <span className="rounded-md border border-[#c9d9d0] bg-[#eef7f1] px-2.5 py-1 text-xs font-black text-tjc-evergreen" key={`${tag}-${index}`}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {largeWarning || hasLargeFile ? (
        <div className="mt-4 rounded-md border border-[#ead6a8] bg-[#fff8e8] p-3 text-sm font-semibold leading-snug text-[#725216]">
          {largeWarning || uploadDefaultState.largeMediaMessage}
        </div>
      ) : null}
    </section>
  );
}
