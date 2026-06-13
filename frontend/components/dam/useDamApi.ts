"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDamJson, sourceFromPayload, type DamApiPayload } from "@/lib/dam-api-client";
import type { BrandKitGovernance } from "@/lib/brand-kit-governance";
import { mediaSourceIsLive, mediaSourceKind, type MediaSourceKind } from "@/lib/media-source/truth";
import { canReview } from "@/lib/permissions";
import type { DamReadinessResult, DemoRole, MediaSourceStatus, ReviewWriteRecordSummary, SearchResult, StockMediaAsset } from "@/lib/types";

type ApiSourceKind = MediaSourceKind;

export type ApiEnvelope<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: MediaSourceStatus | null;
  sourceKind: ApiSourceKind;
  live: boolean;
  refresh: () => void;
};

export type AssetDetailResponse = {
  asset: StockMediaAsset;
  source: MediaSourceStatus;
  sourceKind?: ApiSourceKind;
  live?: boolean;
  related: StockMediaAsset[];
  resourceSpaceUrl?: string;
};

export type ReviewQueueResponse = {
  assets: StockMediaAsset[];
  allAssets: StockMediaAsset[];
  source: MediaSourceStatus;
  sourceKind?: ApiSourceKind;
  live?: boolean;
  governance: Record<string, number>;
  queues: Array<{ id: string; label: string; description: string; count: number }>;
  pendingWrites: Record<string, ReviewWriteRecordSummary>;
  resourceSpaceUrls: Record<string, string>;
  canReview: boolean;
};

export type ReviewRequestResponse = {
  ok?: boolean;
  id?: string;
  message?: string;
  error?: string;
  pendingWriteId?: string;
  pendingWrite?: ReviewWriteRecordSummary;
  syncState?: string;
  mode?: string;
  requestRecorded?: boolean;
  source?: MediaSourceStatus;
  live?: boolean;
};

export type BrandKitResponse = {
  kit: {
    id: string;
    title: string;
    owner: string;
    reviewDate?: string;
    resourceSpaceCollectionId?: string | number | null;
    collectionEnvKey?: string;
    configured: boolean;
    navItems: string[];
    principles: Array<{ title: string; description: string }>;
    keyMessages: string[];
    logoUsage: Array<{ title: string; guidance: string; variant: "color" | "reverse"; discouraged?: boolean }>;
    sections: Array<{ id: string; title: string; envKey?: string; resourceSpaceCollectionId?: string | number; configured: boolean }>;
  };
  assets: StockMediaAsset[];
  governance?: BrandKitGovernance;
  source: MediaSourceStatus;
  sourceKind?: ApiSourceKind;
  live?: boolean;
  warnings: string[];
  collectionStatus?: {
    ok: boolean;
    status: number;
    message: string;
    resourceCount: number;
  };
};

export type DownloadGateResponse = {
  allowed: boolean;
  downloadUrl?: string;
  auditId?: string;
  reason?: string;
  requiredAction?: string;
  message?: string;
  source?: MediaSourceStatus;
  live?: boolean;
};

function useJsonApi<T extends DamApiPayload>(url: string | null, role?: DemoRole): ApiEnvelope<T> {
  const [data, setData] = useState<T | null>(null);
  const [source, setSource] = useState<MediaSourceStatus | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setSource(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDamJson<T>(url)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setSource(sourceFromPayload(payload));
      })
      .catch((apiError: Error) => {
        if (cancelled) return;
        setError(apiError.message);
        setData(null);
        setSource(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, role, version]);

  const sourceKind = useMemo(() => mediaSourceKind(source), [source]);

  return {
    data,
    loading,
    error,
    source,
    sourceKind,
    live: mediaSourceIsLive(source),
    refresh
  };
}

export function useAssetsSearch({
  role,
  query = "",
  filters = [],
  view,
  collection,
  intent,
  sort,
  limit = 24,
  offset = 0
}: {
  role: DemoRole;
  query?: string;
  filters?: string[];
  view?: string;
  collection?: string;
  intent?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  params.set("role", role);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (query) params.set("q", query);
  if (view) params.set("view", view);
  if (collection) params.set("collection", collection);
  if (intent) params.set("intent", intent);
  if (sort) params.set("sort", sort);
  filters.forEach((filter) => params.append("filter", filter));
  return useJsonApi<SearchResult & { sourceStatus?: MediaSourceStatus; sourceKind?: ApiSourceKind; live?: boolean }>(`/api/assets/search?${params.toString()}`, role);
}

export function useAssetDetail(id: string, role: DemoRole) {
  const encoded = encodeURIComponent(id);
  return useJsonApi<AssetDetailResponse>(id ? `/api/assets/${encoded}?role=${encodeURIComponent(role)}` : null, role);
}

export function useReviewQueue(role: DemoRole, queue = "pending") {
  const url = canReview(role) ? `/api/review?role=${encodeURIComponent(role)}&queue=${encodeURIComponent(queue)}` : null;
  return useJsonApi<ReviewQueueResponse>(url, role);
}

export function useReviewRequest(id: string, role: DemoRole) {
  const requestReview = useCallback(async ({ notes }: { notes?: string } = {}) => {
    const response = await fetch("/api/review-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ role, id, notes })
    });
    const payload = await response.json().catch(() => ({ ok: false, error: `Review request failed with ${response.status}` }));
    return payload as ReviewRequestResponse;
  }, [id, role]);

  return { requestReview };
}

export function useInsights(role: DemoRole) {
  return useAssetsSearch({ role, limit: 12 });
}

export function useAdminReadiness(role: DemoRole) {
  const url = role === "DAM Admin" ? `/api/admin/readiness?role=${encodeURIComponent(role)}` : null;
  return useJsonApi<DamReadinessResult>(url, role);
}

export function useBrandKit(id: string, role: DemoRole) {
  return useJsonApi<BrandKitResponse>(`/api/brand-kits/${encodeURIComponent(id)}?role=${encodeURIComponent(role)}`, role);
}

export function useDownloadGate(id: string, role: DemoRole) {
  const requestDownload = useCallback(async ({ termsAccepted = true, usageChannel = "portal", reason = "Approved-copy request", variant = "download" }: {
    termsAccepted?: boolean;
    usageChannel?: string;
    reason?: string;
    variant?: string;
  } = {}) => {
    const response = await fetch(`/api/download/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ role, termsAccepted, usageChannel, reason, variant })
    });
    const payload = await response.json().catch(() => ({ allowed: false, reason: `Download gate failed with ${response.status}` }));
    return payload as DownloadGateResponse;
  }, [id, role]);

  return { requestDownload };
}
