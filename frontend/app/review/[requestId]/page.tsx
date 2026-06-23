import { EnterpriseReviewPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <EnterpriseReviewPage requestId={requestId} />;
}
