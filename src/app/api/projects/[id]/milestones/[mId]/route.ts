import { requireAuth } from "@/lib/auth";
import {
  AppError,
  handleRouteError,
  noContent,
  ok,
  parseRequestBody,
} from "@/lib/http";
import {
  moveMilestoneToOrder,
  resequenceMilestones,
  syncProjectProgress,
} from "@/lib/milestones";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { updateMilestoneSchema } from "@/lib/validations/milestone";

type Params = { id: string; mId: string };

export async function PATCH(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id, mId } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);

    if (project.professionalId !== auth.profile.id) {
      throw new AppError(403, "Само изпълнителят по проекта може да редактира етапи.");
    }

    const body = await parseRequestBody(request, updateMilestoneSchema);

    const updatedProject = await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findFirst({
        where: {
          id: mId,
          projectId: id,
        },
      });

      if (!milestone) {
        throw new AppError(404, "Етапът не е намерен.");
      }

      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          title: body.title,
          completed: body.completed,
          completedAt:
            body.completed === undefined
              ? undefined
              : body.completed
                ? new Date()
                : null,
        },
      });

      if (body.order !== undefined) {
        await moveMilestoneToOrder(tx, id, milestone.id, body.order);
      }

      return syncProjectProgress(tx, id);
    });

    return ok({ project: updatedProject });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id, mId } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);

    if (project.professionalId !== auth.profile.id) {
      throw new AppError(403, "Само изпълнителят по проекта може да изтрива етапи.");
    }

    await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.findFirst({
        where: {
          id: mId,
          projectId: id,
        },
      });

      if (!milestone) {
        throw new AppError(404, "Етапът не е намерен.");
      }

      await tx.milestone.delete({
        where: { id: milestone.id },
      });
      await resequenceMilestones(tx, id);
      await syncProjectProgress(tx, id);
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
