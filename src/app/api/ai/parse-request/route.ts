import { requireAuth } from "@/lib/auth";
import { parseRequest as parseRequestWithAi } from "@/lib/ai/parse-request";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { parseRequestInputSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, parseRequestInputSchema);
    await enforceAiRateLimit(auth.profile.id, "parse-request");

    const interpretation = await parseRequestWithAi(body.description);
    return created({ interpretation });
  } catch (error) {
    return handleRouteError(error);
  }
}
