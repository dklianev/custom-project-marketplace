import { requireAuth } from "@/lib/auth";
import { matchProfessionals } from "@/lib/ai/match-professionals";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { matchProfessionalsSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, matchProfessionalsSchema);
    await enforceAiRateLimit(auth.profile.id, "match-professionals");

    const matches = await matchProfessionals(body);
    return created(matches);
  } catch (error) {
    return handleRouteError(error);
  }
}
