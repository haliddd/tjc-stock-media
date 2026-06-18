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
  | { status: "ready"; label: "Live source" | "Export source" | "Local demo data"; detail: string; source: MediaSourceStatus }
  | { status: "unavailable"; label: "Source unavailable"; detail: string; source?: MediaSourceStatus };

type SearchProbePayload = {
  assets?: unknown[];
  source?: MediaSourceStatus;
  sourceStatus?: MediaSourceStatus;
  live?: boolean;
};

function sourceStateFromPayload(payload: SearchProbePayload): SourceState {
  const source = payload.source || payload.sourceStatus;
  if (!source || !Array.isArray(payload.assets) || payload.assets.length === 0) {
    return { status: "unavailable", label: "Source unavailable", detail: source?.detail || "No source records returned." };
  }
  const live = Boolean(source.live ?? payload.live);
  if (source.adapter === "demo-fallback" || source.sourceKind === "fallback-fixtures") {
    return { status: "ready", label: "Local demo data", detail: source.detail, source };
  }
  if (live && source.readOnly) return { status: "ready", label: "Export source", detail: source.detail, source };
  if (live && !source.readOnly) return { status: "ready", label: "Live source", detail: source.detail, source };
  return { status: "ready", label: source.readOnly ? "Export source" : "Live source", detail: source.detail, source };
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
    if (state.label === "Local demo data") return Database;
    return CheckCircle2;
  }, [state.label, state.status]);
  const visibleLabel = state.status === "ready" ? "Source connected" : state.label;

  return (
    <details
      className={cn(
        "dam-source-status-menu relative max-w-full shrink-0",
        state.status === "loading" && "is-loading",
        state.status === "ready" && state.label !== "Local demo data" && "is-ready",
        state.status === "ready" && state.label === "Local demo data" && "is-fallback",
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
      <div className="dam-source-status-popover" role="menu">
        <div className="dam-source-status-card">
          <span>Source status</span>
          <strong>{state.label}</strong>
          <p>{state.detail}</p>
          <p>Source system connection pending where noted. Original/source files remain restricted.</p>
        </div>
        <div className="dam-source-status-meta">
          <span>Mode</span>
          <strong>{state.source?.readOnly ? "Read-only export" : state.source?.live ? "Live connector" : "Disconnected"}</strong>
        </div>
        <div className="dam-source-status-meta">
          <span>Last check</span>
          <strong>Current session</strong>
        </div>
        {canAdmin(role) ? <Link href={routeWithRole("/admin#launch-gate", role)} role="menuitem">Open source details</Link> : <span className="dam-source-status-note">Admin-only source details hidden for this persona.</span>}
      </div>
    </details>
  );
}
