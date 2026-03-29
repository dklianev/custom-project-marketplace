import { requireAuth } from "@/lib/auth";
import {
  AppError,
  handleRouteError,
  noContent,
  ok,
  parseRequestBody,
} from "@/lib/http";
import {
  ensureRequestAccess,
  ensureRequestOwner,
} from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { updateRequestSchema } from "@/lib/validations/request";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const request = await ensureRequestAccess(id, auth);
    return ok({ request });
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
    const existing = await ensureRequestOwner(id, auth);
    const body = await parseRequestBody(request, updateRequestSchema);

    if (["COMPLETED", "CANCELLED"].includes(existing.status)) {
      throw new AppError(409, "Тази заявка вече не може да бъде редактирана.");
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      if (body.attachments) {
        await tx.attachment.deleteMany({ where: { requestId: existing.id } });
      }

      return tx.request.update({
        where: { id: existing.id },
        data: {
          title: body.title,
          description: body.description,
          category: body.category,
          subCategory: body.subCategory,
          urgency: body.urgency,
          area: body.area,
          priorities: body.priorities,
          specificNotes: body.specificNotes,
          budget: body.budget,
          timeline: body.timeline,
          location: body.location,
          attachments: body.attachments
            ? {
                create: body.attachments,
              }
            : undefined,
        },
        include: {
          attachments: true,
        },
      });
    });

    return ok({ request: updatedRequest });
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
    const { id } = await resolveRouteParams(context);
    const existing = await ensureRequestOwner(id, auth);

    if (existing.status !== "DRAFT") {
      throw new AppError(409, "Само заявки в чернова могат да бъдат изтрити.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({ where: { requestId: existing.id } });
      await tx.request.delete({ where: { id: existing.id } });
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
