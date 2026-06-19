"use client";

import { useEffect, useState, type DragEvent, type RefObject } from "react";
import { CheckCircle2, Clock3, FileCheck2, ShieldAlert, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/ui";
import { LARGE_MEDIA_BYTES, uploadBetaBoundaries, uploadDefaultState } from "@/lib/workflow-policy";

type UploadFileDropzoneProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  selectedFiles: File[];
  onInputFiles: (files: FileList | null) => void;
  onDropFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
};

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024)).toLocaleString()} KB`;
}

function useImageUpload(files: File[]) {
  const [previews, setPreviews] = useState<Array<{ index: number; url: string }>>([]);

  useEffect(() => {
    const nextPreviews = files
      .map((file, index) => file.type.startsWith("image/") ? { index, url: URL.createObjectURL(file) } : null)
      .filter((item): item is { index: number; url: string } => Boolean(item));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  return previews;
}

function fileIsFutureVideoAudio(file: Pick<File, "name" | "type">) {
  return /^video\//i.test(file.type) || /^audio\//i.test(file.type) || /\.(mov|mp4|m4v|avi|mkv|mp3|wav|m4a|aac|flac)$/i.test(file.name);
}

export function UploadFileDropzone({
  inputRef,
  selectedFiles,
  onInputFiles,
  onDropFiles,
  onRemove,
  onClear
}: UploadFileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const imagePreviews = useImageUpload(selectedFiles);
  const imagePreviewByIndex = new Map(imagePreviews.map((preview) => [preview.index, preview.url]));

  function handleDrag(event: DragEvent<HTMLElement>, active: boolean) {
    event.preventDefault();
    setDragging(active);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const dropped = Array.from(event.dataTransfer.files || []);
    if (dropped.length) onDropFiles(dropped);
  }

  return (
    <section
      className="grid gap-3"
      aria-label="File upload and preview"
      data-component="UploadFileDropzone"
      onDragEnter={(event) => handleDrag(event, true)}
      onDragOver={(event) => handleDrag(event, true)}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
      }}
    >
      <div className="grid gap-2 rounded-md border border-[#c8d7e6] bg-[#f2f7fb] p-3 text-sm font-semibold text-[#27435b]">
        <strong>Beta browser upload accepts review-ready photos only.</strong>
        <span>{uploadBetaBoundaries.forbidden[0]}</span>
      </div>
      <label
        className={cn(
          "grid min-h-64 cursor-pointer place-items-center rounded-lg border border-dashed border-[#85a898] bg-[#f7faf7] p-6 text-center text-tjc-ink transition focus-within:border-[#0b4b42] focus-within:ring-2 focus-within:ring-[#9bc5b5]",
          dragging && "scale-[1.01] border-[#0b4b42] bg-[#eef7f1]"
        )}
        onDragEnter={(event) => handleDrag(event, true)}
        onDragOver={(event) => handleDrag(event, true)}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="grid justify-items-center gap-2">
          <span className="grid h-16 w-16 place-items-center rounded-lg border border-[#c4d5ca] bg-white text-tjc-evergreen">
            <UploadCloud size={25} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="text-lg font-black text-tjc-ink">{dragging ? "Release to add files" : "Drop files here or browse"}</span>
          <span id="upload-file-help" className="max-w-[28rem] text-sm font-semibold leading-relaxed text-tjc-muted">
            Photos and lightweight graphics submit as: Submitted / Waiting for review / Do not use yet. Large media needs media team intake before review.
          </span>
        </span>
        <input
          ref={inputRef}
          aria-label="Files"
          aria-describedby="upload-file-help"
          className="sr-only"
          name="files"
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
          multiple
          onChange={(event) => onInputFiles(event.currentTarget.files)}
        />
      </label>

      {selectedFiles.length ? (
        <section className="rounded-lg border border-[#b8c8bf] bg-white p-3" aria-label="Selected file preview" data-component="SelectedFilePreviewList">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-tjc-ink">{selectedFiles.length} staged file{selectedFiles.length === 1 ? "" : "s"}</h3>
              <p className="mt-0.5 text-xs font-semibold text-tjc-muted">Selected locally. Waiting for Submit for review.</p>
            </div>
            <button className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-tjc-line bg-white px-2.5 text-xs font-semibold text-tjc-evergreen transition hover:bg-[#f3f6f2]" type="button" onClick={onClear}>
              <Trash2 size={13} strokeWidth={1.8} aria-hidden="true" />
              Clear files
            </button>
          </div>
          <div className="mt-2 grid gap-2">
            {selectedFiles.map((file, index) => (
              <SelectedFilePreview
                key={`${file.name}-${file.size}-${index}`}
                file={file}
                previewUrl={imagePreviewByIndex.get(index)}
                onRemove={() => onRemove(index)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {selectedFiles.some((file) => file.size > LARGE_MEDIA_BYTES) ? (
        <div className="rounded-md border border-[#ead6a8] bg-[#fff8e8] p-3 text-sm font-semibold text-[#725216]">{uploadDefaultState.largeMediaMessage}</div>
      ) : null}
    </section>
  );
}

export const UploadDropzone = UploadFileDropzone;

export function SelectedFilePreview({ file, previewUrl, onRemove }: { file: File; previewUrl?: string; onRemove: () => void }) {
  const tooLarge = file.size > LARGE_MEDIA_BYTES;
  const futureVideoAudio = fileIsFutureVideoAudio(file);
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[#d6dfd8] px-1 py-3 last:border-b-0" data-component="SelectedFilePreview" aria-label={`${file.name} staged for reviewer intake`}>
      {futureVideoAudio || tooLarge ? (
        <span className="grid h-12 w-12 place-items-center rounded-md border border-[#ead6a8] bg-[#fff8e8] text-[#725216]">
          <ShieldAlert size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
      ) : previewUrl ? (
        <img className="h-12 w-12 rounded-md border border-[#d6dfd8] object-cover" src={previewUrl} alt="" />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-md border border-[#b8d9c6] bg-[#edf8f1] text-tjc-evergreen">
          <FileCheck2 size={17} strokeWidth={1.8} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="mb-1 flex flex-wrap items-center gap-1.5">
          <strong className="min-w-0 max-w-full truncate text-xs font-black text-tjc-ink">{file.name}</strong>
          <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-[#dfbd73] bg-[#fff8e8] px-2 text-[10px] font-black text-[#6f4608]">
            <Clock3 size={11} strokeWidth={1.8} aria-hidden="true" />
            Staged
          </span>
        </span>
        <span className="mt-0.5 block text-[11px] font-semibold text-tjc-muted">{file.type || "unknown type"} / {formatBytes(file.size)}{futureVideoAudio ? " / video-audio blocked in beta" : tooLarge ? " / large-media intake" : ""}</span>
        <span className="mt-2 grid gap-1.5" aria-label="Staged progress: selected, waiting for submit, then reviewer intake">
          <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-tjc-evergreen">
            <CheckCircle2 size={12} strokeWidth={1.8} aria-hidden="true" />
            Selected locally
            <span className="text-[#7a5a19]">Submit next</span>
            <span className="text-tjc-muted">Review after submit</span>
          </span>
          <span className="grid h-1.5 grid-cols-3 overflow-hidden rounded-sm bg-[#edf0eb]" aria-hidden="true">
            <span className="bg-tjc-evergreen" />
            <span className="bg-[#dfbd73]" />
            <span className="bg-[#d7dfd9]" />
          </span>
        </span>
      </span>
      <button className="grid h-9 w-9 place-items-center rounded-md text-tjc-muted transition hover:bg-[#f3f6f2] hover:text-tjc-red" type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
