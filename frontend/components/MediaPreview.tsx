"use client";

import { useState } from "react";
import { AssetPreviewPlaceholder, RestrictedPreviewPanel } from "@/components/DamStates";
import { cn } from "@/lib/ui";

type MediaPreviewProps = {
  src?: string;
  alt: string;
  label?: string;
  detail?: string;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

const unsafePreviewFragments = [
  "file:",
  "/private/",
  "shared drives",
  "shared%20drives",
  "/originals/",
  "/master archive/",
  "sourcepath=",
  "source_path=",
  "masterdrivepath=",
  "master_drive_path="
];

export function isRoleSafePreviewSrc(src?: string) {
  if (!src) return false;
  const normalized = src.trim().toLowerCase();
  if (!normalized) return false;
  let decoded = normalized;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {
    decoded = normalized;
  }
  if (unsafePreviewFragments.some((fragment) => normalized.includes(fragment) || decoded.includes(fragment))) return false;
  try {
    const url = new URL(src, "http://local.tjc");
    if (url.pathname.startsWith("/api/download/")) return false;
    if (url.searchParams.get("variant") === "download") return false;
  } catch {
    return false;
  }
  return true;
}

function previewVariantClass(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return `dam-preview-variant-${(hash % 4) + 1}`;
}

export function MediaPreview({
  src,
  alt,
  label = "Preview pending",
  detail,
  className,
  imgClassName,
  loading = "lazy"
}: MediaPreviewProps) {
  const [failed, setFailed] = useState(false);
  const safeSrc = isRoleSafePreviewSrc(src) ? src : undefined;

  if (safeSrc && !failed) {
    return (
      <img
        className={cn("h-full w-full object-cover", imgClassName)}
        src={safeSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  const restricted = /restricted|unavailable|blocked/i.test(label);

  if (restricted) {
    return <RestrictedPreviewPanel title={label} detail={detail} className={cn("h-full w-full", previewVariantClass(`${alt}-${detail || ""}`), className)} />;
  }

  return <AssetPreviewPlaceholder title={label} detail={detail} className={cn("h-full w-full", className)} />;
}
