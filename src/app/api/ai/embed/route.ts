import { requireAuth } from "@/lib/auth";
import { generateEmbedding } from "@/lib/ai/gateway";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { embedInputSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, embedInputSchema);
    await enforceAiRateLimit(auth.profile.id, "embed");

    const embedding = await generateEmbedding(body.text);
    return created(embedding);
  } catch (error) {
    return handleRouteError(error);
  }
}
