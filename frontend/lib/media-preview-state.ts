import type { StockMediaAsset } from "@/lib/types";

export type MediaPreviewState =
  | "Preview loading"
  | "Preview available"
  | "Preview unavailable"
  | "Preview restricted"
  | "Preview failed"
  | "Unsupported file type";

export function mediaPreviewState(asset?: StockMediaAsset, failed = false): MediaPreviewState {
  if (!asset) return "Preview loading";
  if (failed) return "Preview failed";
  if (asset.mediaType === "audio") return "Unsupported file type";
  if (!asset.thumbnail && !asset.preview && !asset.imageUrls?.small && !asset.imageUrls?.detail) {
    if (asset.reuseDecision?.previewTier === "no-preview" || asset.reuseDecision?.state.startsWith("blocked-")) return "Preview restricted";
    return "Preview unavailable";
  }
  return "Preview available";
}

export function mediaPreviewUnavailableReason(state: MediaPreviewState) {
  switch (state) {
    case "Preview loading":
      return "Loading record preview through the backend.";
    case "Preview failed":
      return "Preview derivative failed to load.";
    case "Preview restricted":
      return "Preview is restricted by rights, role, or review policy.";
    case "Unsupported file type":
      return "This media type does not have an inline preview yet.";
    case "Preview unavailable":
      return "No approved preview is available.";
    default:
      return "";
  }
}
