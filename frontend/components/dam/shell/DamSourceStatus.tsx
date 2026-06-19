"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, Database, Loader2 } from "lucide-react";
import { DAM_LOCAL_BETA_ROLE_HEADER } from "@/lib/dam-api-client";
import { routeWithRole } from "@/lib/role-routes";
import { canAdmin } from "@/lib/permissions";
import { safeSourceStatusCopy } from "@/lib/source-status-copy";
import { cn } from "@/lib/utils";
import type { DemoRole, MediaSourceStatus } from "@/lib/types";

export type SourceState =
  | { status: "loading"; label: "Checking source"; detail: string; source?: undefined }
  | { status: "ready"; label: "Read-only ResourceSpace API" | "Read-only source snapshot" | "Configured read check" | "Local sample data" | "Media library"; detail: string; source: MediaSourceStatus }
  | { status: "unavailable"; label: "Source unavailable"; detail: string; source?: MediaSourceStatus };

type SearchProbePayload = {
  assets?: unknown[];
  source?: MediaSourceStatus;
  sourceStatus?: MediaSourceStatus;
  sourceKind?: MediaSourceStatus["sourceKind"];
  live?: boolean;
};

function isLocalSampleSource(source: MediaSourceStatus, payload: SearchProbePayload) {
  const statusText = [source.adapter, source.sourceKind, payload.sourceKind, source.label, source.detail].filter(Boolean).join(" ");
  return source.adapter === "demo-fallback"
    || source.sourceKind === "fallback-fixtures"
    || payload.sourceKind === "fallback-fixtures"
    || /\b(local sample|demo fallback|fallback fixture|fixture fallback)\b/i.test(statusText);
}

function isMediaLibraryOnlySource(source: MediaSourceStatus, payload: SearchProbePayload) {
  return source.adapter === "media-library" || source.sourceKind === "media-library" || payload.sourceKind === "media-library";
}

function sourceDetailForProbe(source: MediaSourceStatus, hasProbeRecords: boolean) {
  const detail = safeSourceStatusCopy(source.detail || "Source status returned.");
  return hasProbeRecords ? detail : `${detail} No records returned by this read check.`;
}

export function sourceStateFromPayload(payload: SearchProbePayload): SourceState {
  const source = payload.source || payload.sourceStatus;
  if (!source) {
    return { status: "unavailable", label: "Source unavailable", detail: "No source status returned." };
  }
  const hasProbeRecords = Array.isArray(payload.assets) && payload.assets.length > 0;
  const detail = sourceDetailForProbe(source, hasProbeRecords);
  const live = Boolean(source.live ?? payload.live);
  if (isLocalSampleSource(source, payload)) {
    return { status: "ready", label: "Local sample data", detail, source };
  }
  if (isMediaLibraryOnlySource(source, payload)) {
    return { status: "ready", label: "Media library", detail, source };
  }
  if (source.adapter === "resourcespace-api") return { status: "ready", label: "Read-only ResourceSpace API", detail, source };
  if (source.readOnly || live) return { status: "ready", label: "Read-only source snapshot", detail, source };
  return { status: "ready", label: "Configured read check", detail, source };
}

export function sourceModeLabel(state: SourceState) {
  if (state.label === "Local sample data") return "Disconnected local sample";
  if (state.label === "Media library") return "Media library only";
  if (state.source?.adapter === "resourcespace-api") return "Read-only API check";
  if (state.label === "Read-only source snapshot") return "Read-only snapshot";
  if (state.source?.readOnly) return "Read-only snapshot";
  return "Configured read check";
}

function publicSourceStatusLabel(state: SourceState) {
  if (state.status === "loading") return "Checking media";
  if (state.status === "unavailable") return "Media check unavailable";
  if (state.label === "Local sample data") return "Sample media";
  return "Media library check";
}

function publicSourceStatusDetail(state: SourceState) {
  if (state.status === "loading") return "Checking whether media records can be read.";
  if (state.status === "unavailable") return "Media status could not be checked. Browse and request actions stay guarded.";
  return "Read check completed. Browse and request actions still follow media-use rules.";
}

export function DamSourceStatus({ role, compact = false, className }: { role: DemoRole; compact?: boolean; className?: string }) {
  const [state, setState] = useState<SourceState>({
    status: "loading",
    label: "Checking source",
    detail: "Checking media-library source state."
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", label: "Checking source", detail: "Checking media-library source state." });
    fetch("/api/assets/search?limit=1", {
      headers: { [DAM_LOCAL_BETA_ROLE_HEADER]: role },
      signal: controller.signal
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Source check failed.");
        setState(sourceStateFromPayload(body));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          status: "unavailable",
          label: "Source unavailable",
          detail: error instanceof Error ? error.message : "Source check failed."
        });
      });
    return () => controller.abort();
  }, [role]);

  const Icon = useMemo(() => {
    if (state.status === "loading") return Loader2;
    if (state.status === "unavailable") return AlertCircle;
    if (state.label === "Local sample data" || state.label === "Media library") return Database;
    return CheckCircle2;
  }, [state.label, state.status]);
  const adminView = canAdmin(role);
  const visibleLabel = adminView ? state.label : publicSourceStatusLabel(state);
  const visibleDetail = adminView ? state.detail : publicSourceStatusDetail(state);
  const disconnectedLabel = state.label === "Local sample data" || state.label === "Media library";
  const modeLabel = adminView ? sourceModeLabel(state) : "Read check";
  const sourceName = safeSourceStatusCopy(state.source?.label || "Media source");

  return (
    <details
      className={cn(
        "dam-source-status-menu relative max-w-full shrink-0",
        state.status === "loading" && "is-loading",
        state.status === "ready" && !disconnectedLabel && "is-ready",
        state.status === "ready" && disconnectedLabel && "is-fallback",
        state.status === "unavailable" && "is-unavailable",
        className
      )}
    >
      <summary
        className="dam-source-status-pill inline-flex min-h-9 max-w-full cursor-pointer list-none items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-xs font-black"
        title={visibleDetail}
        aria-label={`${visibleLabel}: ${visibleDetail}`}
      >
        <Icon className={cn("size-4", state.status === "loading" && "animate-spin")} aria-hidden="true" />
        <span>{visibleLabel}</span>
        {!compact && adminView ? <span className="hidden max-w-[11rem] truncate font-semibold text-current/72 2xl:inline">{sourceName}</span> : null}
        <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
      </summary>
      <div className="dam-source-status-popover" role="region" aria-label={adminView ? "Source status details" : "Media status details"}>
        <div className="dam-source-status-card">
          <span>{adminView ? "Source status" : "Media status"}</span>
          <strong>{visibleLabel}</strong>
          <p>{visibleDetail}</p>
          <p>{adminView ? "Status is a read check only. Original/source files remain restricted; no writeback, publication, download enablement, or sync is implied." : "Original files remain restricted. No publication, file handoff, or status change is implied."}</p>
        </div>
        <div className="dam-source-status-meta">
          <span>Mode</span>
          <strong>{modeLabel}</strong>
        </div>
        <div className="dam-source-status-meta">
          <span>Last check</span>
          <strong>Current session</strong>
        </div>
        {adminView ? <Link href={routeWithRole("/admin#system-health-section", role)}>Open source details</Link> : <span className="dam-source-status-note">Admin-only details hidden for this persona.</span>}
      </div>
    </details>
  );
}
