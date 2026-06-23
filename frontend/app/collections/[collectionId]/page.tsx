import { EnterpriseCollectionsPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return <EnterpriseCollectionsPage collectionId={collectionId} />;
}
