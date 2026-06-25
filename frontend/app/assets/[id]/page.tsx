import { notFound } from "next/navigation";
import { AtlasAssetDetailPage } from "@/components/dam/EnterpriseDamPages";
import { normalizeAssetId } from "@/lib/request-validation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  if (!id) notFound();
  return <AtlasAssetDetailPage id={id} />;
}
