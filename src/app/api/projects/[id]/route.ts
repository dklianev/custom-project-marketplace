import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  handleRouteError,
  ok,
  parseRequestBody,
} from "@/lib/http";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

const updateProjectSchema = z.object({
  status: z
    .enum([
      "CREATED",
      "REVIEW",
      "DESIGN",
      "APPROVAL",
      "FINALIZATION",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().datetime().optional(),
});

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const project = await ensureProjectAccess(id, auth);
    return ok({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    await ensureProjectAccess(id, auth);
    const body = await parseRequestBody(request, updateProjectSchema);

    const project = await prisma.project.update({
      where: { id },
      data: {
        status: body.status,
        progress: body.progress,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
      include: {
        milestones: {
          orderBy: { order: "asc" },
        },
        payment: true,
        review: true,
      },
    });

    return ok({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}
