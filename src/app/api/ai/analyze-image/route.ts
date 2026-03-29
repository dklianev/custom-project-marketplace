import { requireAuth } from "@/lib/auth";
import { visionAnalysis } from "@/lib/ai/gateway";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { analyzeImageSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, analyzeImageSchema);
    await enforceAiRateLimit(auth.profile.id, "analyze-image");

    const result = await visionAnalysis({
      imageUrl: body.imageUrl,
      prompt: body.prompt,
      jsonMode: body.jsonMode,
    });

    return created({
      text: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
