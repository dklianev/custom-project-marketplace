import { requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string };

export async function PATCH(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!message) {
      throw new AppError(404, "Съобщението не е намерено.");
    }

    const isParticipant =
      message.project.clientId === auth.profile.id ||
      message.project.professionalId === auth.profile.id;

    if (!isParticipant) {
      throw new AppError(403, "Нямате достъп до това съобщение.");
    }

    if (message.senderId === auth.profile.id) {
      throw new AppError(400, "Не можете да маркирате собственото си съобщение като прочетено.");
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { read: true },
    });

    return ok({ message: updatedMessage });
  } catch (error) {
    return handleRouteError(error);
  }
}
