"use client";

import { useState, type ReactNode } from "react";
import type { DemoRole } from "@/lib/types";

type DownloadHrefParts = {
  assetId: string;
  role: DemoRole;
};

type GatedDownloadButtonProps = {
  href?: string;
  assetId?: string;
  role?: DemoRole;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  reason?: string;
  usageChannel?: string;
  disabled?: boolean;
};

const roles: DemoRole[] = ["Viewer", "Contributor", "Reviewer", "DAM Admin"];

export function parseDownloadGateHref(href?: string): DownloadHrefParts | null {
  if (!href) return null;
  try {
    const url = new URL(href, "http://local.tjc");
    const match = url.pathname.match(/^\/api\/download\/([^/]+)$/);
    const rawRole = url.searchParams.get("role");
    if (!match || !rawRole || !roles.includes(rawRole as DemoRole)) return null;
    return { assetId: decodeURIComponent(match[1]), role: rawRole as DemoRole };
  } catch {
    return null;
  }
}

function downloadGateUrl(assetId: string, role: DemoRole) {
  const params = new URLSearchParams({ role });
  return `/api/download/${encodeURIComponent(assetId)}?${params.toString()}`;
}

export function GatedDownloadButton({
  href,
  assetId,
  role,
  className,
  children,
  ariaLabel,
  reason = "Approved-copy request",
  usageChannel = "portal",
  disabled
}: GatedDownloadButtonProps) {
  const parsed = parseDownloadGateHref(href);
  const resolvedAssetId = assetId || parsed?.assetId || "";
  const resolvedRole = role || parsed?.role || "Viewer";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attested, setAttested] = useState(false);

  async function requestDownload() {
    if (!resolvedAssetId || loading || disabled) return;
    const termsAccepted = attested || window.confirm("I attest this approved copy will be used only within its visible usage terms.");
    if (!termsAccepted) {
      setError("Usage terms must be accepted before download.");
      return;
    }
    setAttested(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(downloadGateUrl(resolvedAssetId, resolvedRole), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-tjc-local-beta-role": resolvedRole
        },
        body: JSON.stringify({
          termsAccepted,
          usageChannel,
          reason,
          variant: "download"
        })
      });
      const payload = await response.json().catch(() => ({})) as { allowed?: boolean; downloadUrl?: string; reason?: string; error?: string };
      if (!response.ok || !payload.allowed || !payload.downloadUrl) {
        setError(payload.reason || payload.error || "Download blocked by gate.");
        return;
      }
      const link = document.createElement("a");
      link.href = payload.downloadUrl;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Download gate unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={requestDownload}
      aria-label={ariaLabel}
      aria-busy={loading}
      disabled={disabled || loading || !resolvedAssetId}
      title={error || undefined}
    >
      {children}
    </button>
  );
}
