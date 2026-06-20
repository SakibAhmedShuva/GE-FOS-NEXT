import AiHelperClient from "@/components/ai-helper/ai-helper-client";
export default async function AiHelperPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const params = await searchParams;
  return <AiHelperClient projectId={params.projectId || ""} />;
}
