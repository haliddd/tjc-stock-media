import { AtlasCollectionsPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ collectionId: string }> }) {
  await params;
  return <AtlasCollectionsPage />;
}
