import type { MediaSourceStatus } from "@/lib/types";

export type MediaSourceKind = "resourcespace" | "fallback-fixtures" | "media-library";

export function mediaSourceKind(source?: MediaSourceStatus | null): MediaSourceKind {
  if (!source) return "media-library";
  if (source.sourceKind) return source.sourceKind;
  if (source.adapter === "demo-fallback") return "fallback-fixtures";
  if (source.adapter === "media-library") return "media-library";
  return "resourcespace";
}

export function mediaSourceIsLive(source?: MediaSourceStatus | null) {
  if (typeof source?.live === "boolean") return source.live;
  return Boolean(source && mediaSourceKind(source) === "resourcespace");
}
