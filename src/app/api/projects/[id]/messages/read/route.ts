import { requireAuth } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string };

export async function POST(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    await ensureProjectAccess(id, auth);

    const unreadMessages = await prisma.message.findMany({
      where: {
        projectId: id,
        senderId: { not: auth.profile.id },
        read: false,
      },
      select: {
        id: true,
      },
    });

    const messageIds = unreadMessages.map((message) => message.id);

    if (messageIds.length > 0) {
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
        },
        data: {
          read: true,
        },
      });
    }

    return ok({
      messageIds,
      count: messageIds.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
