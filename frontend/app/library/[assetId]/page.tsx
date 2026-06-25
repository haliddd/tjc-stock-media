import { notFound } from "next/navigation";
import { AtlasAssetDetailPage } from "@/components/dam/EnterpriseDamPages";
import { normalizeAssetId } from "@/lib/request-validation";

export default async function Page({ params }: { params: Promise<{ assetId: string }> }) {
  const assetId = normalizeAssetId((await params).assetId);
  if (!assetId) notFound();
  return <AtlasAssetDetailPage id={assetId} />;
}
