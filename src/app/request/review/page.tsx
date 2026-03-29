import { RequestReviewExperience } from "@/components/request-review-experience";
import { buildRequestDraft } from "@/lib/request-flow";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReviewRequestPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestId = takeFirst(params.requestId) ?? takeFirst(params.id) ?? null;
  const draft = buildRequestDraft({
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
    <RequestReviewExperience requestId={requestId} fallbackDraft={draft} />
  );
}
