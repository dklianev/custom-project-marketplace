import { requireAuth } from "@/lib/auth";
import { translate } from "@/lib/ai/translate";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { translateSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, translateSchema);
    await enforceAiRateLimit(auth.profile.id, "translate");

    const text = await translate(body.text, body.from, body.to);
    return created({ text });
  } catch (error) {
    return handleRouteError(error);
  }
}
