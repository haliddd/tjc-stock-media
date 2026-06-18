import { EnterprisePackageBuilderPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ params }: { params: Promise<{ distributionSetId: string }> }) {
  await params;
  return <EnterprisePackageBuilderPage />;
}
