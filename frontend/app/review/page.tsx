import { TjcDamReviewPage } from "@/components/dam/EnterpriseDamPages";

export default async function Page({ searchParams }: { searchParams?: Promise<{ queue?: string }> }) {
  await searchParams;
  return <TjcDamReviewPage />;
}
