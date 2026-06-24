import type { MediaSourceStatus } from "@/lib/types";

export type MediaSourceKind = "resourcespace" | "fallback-fixtures" | "media-library";
export type MediaSourceTruthBoundary = "resourcespace-truth" | "fallback-fixtures" | "media-library";

export function mediaSourceKind(source?: MediaSourceStatus | null): MediaSourceKind {
  if (!source) return "media-library";
  if (source.sourceKind) return source.sourceKind;
  if (source.adapter === "demo-fallback") return "fallback-fixtures";
  if (source.adapter === "media-library") return "media-library";
  return "resourcespace";
}

export function mediaSourceIsLive(source?: MediaSourceStatus | null) {
  if (typeof source?.live === "boolean") return source.live;
  return Boolean(source && source.adapter === "resourcespace-api" && !source.readOnly);
}

export function mediaSourceTruthBoundary(source?: MediaSourceStatus | null): MediaSourceTruthBoundary {
  const kind = mediaSourceKind(source);
  if (kind === "resourcespace") return "resourcespace-truth";
  if (kind === "fallback-fixtures") return "fallback-fixtures";
  return "media-library";
}
