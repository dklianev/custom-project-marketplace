import { requireAuth } from "@/lib/auth";
import { summarizeProject } from "@/lib/ai/summarize";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { created, handleRouteError, parseRequestBody } from "@/lib/http";
import { summarizeProjectSchema } from "@/lib/validations/ai";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, summarizeProjectSchema);
    await enforceAiRateLimit(auth.profile.id, "summarize-project");

    const summary = await summarizeProject(body);
    return created({ summary });
  } catch (error) {
    return handleRouteError(error);
  }
}
