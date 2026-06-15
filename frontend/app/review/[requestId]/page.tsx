import { EnterpriseReviewPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  await params;
  return <EnterpriseReviewPage />;
}
