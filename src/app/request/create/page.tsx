import { CreateRequestExperience } from "@/components/request-clarification";
import { buildRequestDraft } from "@/lib/request-flow";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreateRequestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestId = takeFirst(params.requestId) ?? takeFirst(params.id) ?? null;
  const initialDraft = buildRequestDraft({
    query: takeFirst(params.query) ?? takeFirst(params.q) ?? undefined,
    city: takeFirst(params.city) ?? undefined,
    budget: takeFirst(params.budget) ?? undefined,
    timeline: takeFirst(params.timeline) ?? undefined,
    scope: takeFirst(params.scope) ?? undefined,
    priority: takeFirst(params.priority) ?? undefined,
    style: takeFirst(params.style) ?? undefined,
    notes: takeFirst(params.notes) ?? undefined,
  });

  return (
    <CreateRequestExperience
      initialDraft={initialDraft}
      initialRequestId={requestId}
    />
  );
}
