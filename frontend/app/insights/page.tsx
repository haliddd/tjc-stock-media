import { redirect } from "next/navigation";
import { EnterpriseInsightsPage } from "@/components/dam/EnterpriseDamPages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  if (params?.panel === "rights-usage") {
    const role = typeof params.role === "string" ? params.role : undefined;
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : "";
    redirect(`/review?queue=rights-review${roleParam}`);
  }
  return <EnterpriseInsightsPage />;
}
