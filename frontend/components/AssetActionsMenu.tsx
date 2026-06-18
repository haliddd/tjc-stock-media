"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { DropdownActionMenu, type DropdownAction } from "@/components/DropdownActionMenu";
import { assetResourceRef, publicAssetRef } from "@/lib/asset-refs";
import { toastSaveFailed, toastShareCopied } from "@/lib/tjc-toasts";
import type { StockMediaAsset } from "@/lib/types";

type AssetActionsMenuProps = {
  asset: StockMediaAsset;
  resourceSpaceUrl: string | null;
  canOpenResourceSpace: boolean;
  canExposeResourceSpaceId?: boolean;
  label?: string;
};

export function AssetActionsMenu({ asset, resourceSpaceUrl, canOpenResourceSpace, canExposeResourceSpaceId = false, label = "Asset actions" }: AssetActionsMenuProps) {
  const [status, setStatus] = useState("");
  const copyRef = canExposeResourceSpaceId ? assetResourceRef(asset) : publicAssetRef(asset);
  const recordLabel = canExposeResourceSpaceId ? "ResourceSpace ID" : "reference code";

  async function copyText(value: string, label: string) {
    if (!navigator.clipboard?.writeText) {
      setStatus("Copy unavailable in this browser.");
      toastSaveFailed("Copy unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied.`);
      toastShareCopied(`${label} copied`);
    } catch {
      setStatus(`${label} could not be copied.`);
      toastSaveFailed(`${label} could not be copied.`);
    }
  }

  const actions: DropdownAction[] = [
    {
      id: "copy-resource-id",
      label: canExposeResourceSpaceId ? "Copy ResourceSpace ID" : "Copy reference code",
      detail: canExposeResourceSpaceId ? copyRef : "Use this when asking the media team for help",
      icon: <Copy size={15} strokeWidth={1.8} aria-hidden="true" />,
      onSelect: () => copyText(copyRef, recordLabel)
    },
    {
      id: "copy-portal-link",
      label: "Copy portal link",
      detail: "Local portal asset URL",
      icon: <LinkIcon size={15} strokeWidth={1.8} aria-hidden="true" />,
      onSelect: () => copyText(window.location.href, "Portal link")
    }
  ];

  if (resourceSpaceUrl && canOpenResourceSpace) {
    actions.push({
      id: "open-resourcespace",
      label: "Open in ResourceSpace",
      detail: "DAM Admin source-of-truth view",
      icon: <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />,
      href: resourceSpaceUrl,
      external: true
    });
  }

  return <DropdownActionMenu label={label} actions={actions} status={status} />;
}
