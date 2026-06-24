import { getActiveMediaSource } from "@/lib/media-source";
import {
  mediaSourceIsLive,
  mediaSourceKind,
  mediaSourceTruthBoundary,
  type MediaSourceKind,
  type MediaSourceTruthBoundary
} from "@/lib/media-source/truth";
import { sourceForRole } from "@/lib/source-redaction";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export type MediaSourceEnvelope = {
  source: MediaSourceStatus;
  sourceStatus: MediaSourceStatus;
  sourceKind: MediaSourceKind;
  truthBoundary: MediaSourceTruthBoundary;
  resourceSpaceBacked: boolean;
  fallbackOnly: boolean;
  live: boolean;
};

export type MediaSourceSession = MediaSourceEnvelope & {
  assets: StockMediaAsset[];
  rawSource: MediaSourceStatus;
};

export function sourceEnvelope(source: MediaSourceStatus): MediaSourceEnvelope {
  const sourceKind = mediaSourceKind(source);
  const live = mediaSourceIsLive(source);
  const truthBoundary = mediaSourceTruthBoundary(source);
  const resourceSpaceBacked = truthBoundary === "resourcespace-truth";
  const fallbackOnly = truthBoundary === "fallback-fixtures";
  const normalizedSource = { ...source, sourceKind, live, truthBoundary, resourceSpaceBacked, fallbackOnly };
  return {
    source: normalizedSource,
    sourceStatus: normalizedSource,
    sourceKind,
    truthBoundary,
    resourceSpaceBacked,
    fallbackOnly,
    live
  };
}

export function roleSourceEnvelope(role: DemoRole, source: MediaSourceStatus): MediaSourceEnvelope {
  return sourceEnvelope(sourceForRole(role, source));
}

export async function getMediaSourceSession(role: DemoRole): Promise<MediaSourceSession> {
  const { assets, status } = await getActiveMediaSource();
  return {
    assets,
    rawSource: status,
    ...roleSourceEnvelope(role, status)
  };
}
