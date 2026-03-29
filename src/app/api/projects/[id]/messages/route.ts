import { requireAuth } from "@/lib/auth";
import { enforceAiRateLimit } from "@/lib/ai/rate-limit";
import { moderateContent } from "@/lib/ai/gateway";
import {
  AppError,
  created,
  handleRouteError,
  ok,
  parseRequestBody,
} from "@/lib/http";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { sendMessageSchema } from "@/lib/validations/message";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);
    return ok({ messages: project.messages });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    await ensureProjectAccess(id, auth);
    const body = await parseRequestBody(request, sendMessageSchema);

    await enforceAiRateLimit(auth.profile.id, "moderate");
    const moderation = await moderateContent(body.text);
    if (moderation.flagged) {
      throw new AppError(400, "Съобщението беше отхвърлено от модерацията.");
    }

    const message = await prisma.message.create({
      data: {
        projectId: id,
        senderId: auth.profile.id,
        text: body.text,
        imageUrl: body.imageUrl,
      },
      include: {
        sender: true,
      },
    });

    return created({ message });
  } catch (error) {
    return handleRouteError(error);
  }
}
