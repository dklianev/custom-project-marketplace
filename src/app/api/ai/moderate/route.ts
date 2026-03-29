import { requireAuth } from "@/lib/auth";
import { moderateContent } from "@/lib/ai/gateway";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { moderateInputSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, moderateInputSchema);
    await enforceAiRateLimit(auth.profile.id, "moderate");

    const moderation = await moderateContent(body.text);
    return created(moderation);
  } catch (error) {
    return handleRouteError(error);
  }
}
