import { RequestLoadingExperience } from "@/components/request-loading-experience";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RequestLoadingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestId = takeFirst(params.requestId) ?? takeFirst(params.id) ?? null;

  return <RequestLoadingExperience requestId={requestId} />;
}
