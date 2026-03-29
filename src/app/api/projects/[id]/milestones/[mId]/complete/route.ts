import { requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok } from "@/lib/http";
import { syncProjectProgress } from "@/lib/milestones";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string; mId: string };

export async function POST(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id, mId } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);

    if (project.professionalId !== auth.profile.id) {
      throw new AppError(403, "Само изпълнителят по проекта може да маркира етап като завършен.");
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: mId,
        projectId: id,
      },
    });

    if (!milestone) {
      throw new AppError(404, "Етапът не е намерен.");
    }

    const updatedProject = await prisma.$transaction(async (tx) => {
      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          completed: true,
          completedAt: new Date(),
        },
      });

      return syncProjectProgress(tx, id);
    });

    return ok({ project: updatedProject });
  } catch (error) {
    return handleRouteError(error);
  }
}
