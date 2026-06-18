import { GuidePage } from "@/components/GuidePage";

export default async function Page({ params }: { params: Promise<{ articleId: string }> }) {
  await params;
  return <GuidePage />;
}
