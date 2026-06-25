import { TjcDamRequestsPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ requestId: string }> }) {
  await params;
  return <TjcDamRequestsPage />;
}
