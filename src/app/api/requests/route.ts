import type { Prisma, RequestStatus } from "@prisma/client";
import { requireAuth, requireRole } from "@/lib/auth";
import { buildRequestTitle } from "@/lib/marketplace";
import {
  created,
  handleRouteError,
  ok,
  parseBoolean,
  parseRequestBody,
} from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  createRequestSchema,
  requestStatusSchema,
} from "@/lib/validations/request";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const includeArchived = parseBoolean(url.searchParams.get("includeArchived"));

    const status = statusParam
      ? requestStatusSchema.parse(statusParam)
      : undefined;
    const clientWhere: Prisma.RequestWhereInput = status
      ? { clientId: auth.profile.id, status }
      : includeArchived
        ? { clientId: auth.profile.id }
        : {
            clientId: auth.profile.id,
            status: { notIn: ["CANCELLED" as RequestStatus] },
          };

    const professionalWhere: Prisma.RequestWhereInput = status
      ? { status }
      : { status: "MATCHING" };

    const requests = await prisma.request.findMany({
      where:
        auth.profile.role === "CLIENT"
          ? clientWhere
          : professionalWhere,
      include: {
        attachments: true,
        offers: {
          include: {
            professional: true,
          },
          orderBy: [{ featured: "desc" }, { price: "asc" }],
        },
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ requests });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireRole(await requireAuth(), ["CLIENT"]);
    const body = await parseRequestBody(request, createRequestSchema);

    const createdRequest = await prisma.request.create({
      data: {
        clientId: auth.profile.id,
        title: body.title ?? buildRequestTitle(body.description),
        description: body.description,
        category: body.category,
        subCategory: body.subCategory,
        urgency: body.urgency,
        area: body.area,
        priorities: body.priorities ?? [],
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

    return created({ request: createdRequest });
  } catch (error) {
    return handleRouteError(error);
  }
}
