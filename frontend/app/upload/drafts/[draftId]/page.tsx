import { AtlasUploadPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ draftId: string }> }) {
  await params;
  return <AtlasUploadPage />;
}
