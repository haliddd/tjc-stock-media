import { EnterpriseHelpPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ articleId: string }> }) {
  await params;
  return <EnterpriseHelpPage />;
}
