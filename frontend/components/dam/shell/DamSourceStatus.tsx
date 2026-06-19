"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, Database, Loader2 } from "lucide-react";
import { DAM_LOCAL_BETA_ROLE_HEADER } from "@/lib/dam-api-client";
import { routeWithRole } from "@/lib/role-routes";
import { canAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { DemoRole, MediaSourceStatus } from "@/lib/types";

type SourceState =
  | { status: "loading"; label: "Checking source"; detail: string; source?: undefined }
  | { status: "ready"; label: "ResourceSpace read path" | "Source snapshot" | "Configured read path" | "Local sample data" | "Media library"; detail: string; source: MediaSourceStatus }
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

function sourceStateFromPayload(payload: SearchProbePayload): SourceState {
  const source = payload.source || payload.sourceStatus;
  if (!source || !Array.isArray(payload.assets) || payload.assets.length === 0) {
    return { status: "unavailable", label: "Source unavailable", detail: source?.detail || "No source records returned." };
  }
  const live = Boolean(source.live ?? payload.live);
  if (isLocalSampleSource(source, payload)) {
    return { status: "ready", label: "Local sample data", detail: source.detail, source };
  }
  if (isMediaLibraryOnlySource(source, payload)) {
    return { status: "ready", label: "Media library", detail: source.detail, source };
  }
  if (source.readOnly) return { status: "ready", label: "Source snapshot", detail: source.detail, source };
  if (live && source.adapter === "resourcespace-api") return { status: "ready", label: "ResourceSpace read path", detail: source.detail, source };
  return { status: "ready", label: "Configured read path", detail: source.detail, source };
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
  const visibleLabel = state.label;
  const disconnectedLabel = state.label === "Local sample data" || state.label === "Media library";
  const modeLabel = state.label === "Local sample data"
    ? "Disconnected local sample"
    : state.label === "Media library"
      ? "Media library only"
      : state.source?.readOnly
        ? "Read-only snapshot"
        : state.source?.live
          ? "API read path"
          : "Configured read path";

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
        title={state.detail}
        aria-label={`${state.label}: ${state.detail}`}
      >
        <Icon className={cn("size-4", state.status === "loading" && "animate-spin")} aria-hidden="true" />
        <span>{visibleLabel}</span>
        {!compact ? <span className="hidden max-w-[11rem] truncate font-semibold text-current/72 2xl:inline">{state.source?.label || "Media source"}</span> : null}
        <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
      </summary>
      <div className="dam-source-status-popover" role="region" aria-label="Source status details">
        <div className="dam-source-status-card">
          <span>Source status</span>
          <strong>{state.label}</strong>
          <p>{state.detail}</p>
          <p>Status is a read check only. Original/source files remain restricted; no writeback or sync is implied.</p>
        </div>
        <div className="dam-source-status-meta">
          <span>Mode</span>
          <strong>{modeLabel}</strong>
        </div>
        <div className="dam-source-status-meta">
          <span>Last check</span>
          <strong>Current session</strong>
        </div>
        {canAdmin(role) ? <Link href={routeWithRole("/admin#launch-readiness-section", role)}>Open source details</Link> : <span className="dam-source-status-note">Admin-only source details hidden for this persona.</span>}
      </div>
    </details>
  );
}
