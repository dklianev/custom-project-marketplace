import { requireAuth } from "@/lib/auth";
import {
  AppError,
  created,
  handleRouteError,
  ok,
  parseRequestBody,
} from "@/lib/http";
import {
  moveMilestoneToOrder,
  syncProjectProgress,
} from "@/lib/milestones";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { createMilestoneSchema } from "@/lib/validations/milestone";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);

    return ok({ milestones: project.milestones });
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
    const project = await ensureProjectAccess(id, auth);

    if (project.professionalId !== auth.profile.id) {
      throw new AppError(403, "Само изпълнителят по проекта може да добавя етапи.");
    }

    const body = await parseRequestBody(request, createMilestoneSchema);

    const updatedProject = await prisma.$transaction(async (tx) => {
      const existing = await tx.milestone.findMany({
        where: { projectId: id },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      });

      const milestone = await tx.milestone.create({
        data: {
          projectId: id,
          title: body.title,
          order: existing.length + 1,
        },
      });

      if (body.order !== undefined && body.order < existing.length + 1) {
        await moveMilestoneToOrder(tx, id, milestone.id, body.order);
      }

      return syncProjectProgress(tx, id);
    });

    return created({ project: updatedProject });
  } catch (error) {
    return handleRouteError(error);
  }
}
