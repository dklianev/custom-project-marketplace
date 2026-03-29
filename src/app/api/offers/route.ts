import { requireAuth, requireRole } from "@/lib/auth";
import {
  AppError,
  created,
  handleRouteError,
  ok,
  parseRequestBody,
} from "@/lib/http";
import { getRequestOrThrow } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { createOfferSchema } from "@/lib/validations/offer";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    const url = new URL(request.url);
    const requestId = url.searchParams.get("requestId");

    const offers = await prisma.offer.findMany({
      where:
        auth.profile.role === "PROFESSIONAL"
          ? {
              professionalId: auth.profile.id,
              ...(requestId ? { requestId } : {}),
            }
          : {
              request: {
                clientId: auth.profile.id,
              },
              ...(requestId ? { requestId } : {}),
            },
      include: {
        professional: true,
        request: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ offers });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireRole(await requireAuth(), ["PROFESSIONAL"]);
    const body = await parseRequestBody(request, createOfferSchema);
    const targetRequest = await getRequestOrThrow(body.requestId);

    if (targetRequest.clientId === auth.profile.id) {
      throw new AppError(409, "Не можете да изпратите оферта по собствената си заявка.");
    }

    if (!["MATCHING", "OFFERS_RECEIVED", "PENDING"].includes(targetRequest.status)) {
      throw new AppError(409, "Тази заявка вече не приема оферти.");
    }

    const existingOffer = await prisma.offer.findFirst({
      where: {
        requestId: body.requestId,
        professionalId: auth.profile.id,
      },
    });

    if (existingOffer) {
      throw new AppError(409, "Вече сте изпратили оферта по тази заявка.");
    }

    const offer = await prisma.$transaction(async (tx) => {
      const createdOffer = await tx.offer.create({
        data: {
          requestId: body.requestId,
          professionalId: auth.profile.id,
          price: body.price,
          timeline: body.timeline,
          scope: body.scope,
          warranty: body.warranty,
          revisions: body.revisions,
          quote: body.quote,
          featured: body.featured ?? false,
          portfolioImages: body.portfolioImages ?? [],
        },
        include: {
          professional: true,
          request: true,
        },
      });

      if (["MATCHING", "PENDING"].includes(targetRequest.status)) {
        await tx.request.update({
          where: { id: targetRequest.id },
          data: { status: "OFFERS_RECEIVED" },
        });
      }

      return createdOffer;
    });

    return created({ offer });
  } catch (error) {
    return handleRouteError(error);
  }
}
