import { TjcDamUploadPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ draftId: string }> }) {
  await params;
  return <TjcDamUploadPage />;
}
