import { requireAuth, requireRole } from "@/lib/auth";
import { suggestPrice } from "@/lib/ai/suggest-price";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { suggestPriceSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = requireRole(await requireAuth(), ["PROFESSIONAL"]);
    const body = await parseRequestBody(request, suggestPriceSchema);
    await enforceAiRateLimit(auth.profile.id, "suggest-price");

    const suggestion = await suggestPrice(body);
    return created({ suggestion });
  } catch (error) {
    return handleRouteError(error);
  }
}
