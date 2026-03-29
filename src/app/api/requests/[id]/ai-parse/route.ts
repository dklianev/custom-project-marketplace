import { requireAuth } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { parseRequest as parseRequestWithAi } from "@/lib/ai/parse-request";
import { handleRouteError, ok, parseRequestBody } from "@/lib/http";
import { ensureRequestOwner } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { aiParseRequestSchema } from "@/lib/validations/request";

type Params = { id: string };

export async function POST(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const existing = await ensureRequestOwner(id, auth);
    const body = await parseRequestBody(request, aiParseRequestSchema);

    await enforceAiRateLimit(auth.profile.id, "parse-request");

    const description = body.description ?? existing.description;
    const interpretation = await parseRequestWithAi(description);

    const updatedRequest = await prisma.request.update({
      where: { id: existing.id },
      data: {
        aiInterpretation: JSON.stringify(interpretation),
        category: interpretation.category ?? existing.category,
        subCategory: interpretation.subCategory ?? existing.subCategory,
        budget: interpretation.suggestedBudget ?? existing.budget,
        timeline: interpretation.suggestedTimeline ?? existing.timeline,
        urgency: interpretation.urgency ?? existing.urgency,
      },
    });

    return ok({
      request: updatedRequest,
      interpretation,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
