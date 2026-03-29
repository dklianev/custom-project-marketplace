import { requireAuth } from "@/lib/auth";
import {
  AppError,
  handleRouteError,
  ok,
  parseRequestBody,
} from "@/lib/http";
import { ensureOfferAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { updateOfferSchema } from "@/lib/validations/offer";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const offer = await ensureOfferAccess(id, auth);
    return ok({ offer });
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
    const offer = await ensureOfferAccess(id, auth);
    const body = await parseRequestBody(request, updateOfferSchema);

    if (offer.professionalId !== auth.profile.id) {
      throw new AppError(403, "Само авторът на офертата може да я редактира.");
    }

    if (offer.status !== "PENDING") {
      throw new AppError(409, "Само чакащи оферти могат да се редактират.");
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        price: body.price,
        timeline: body.timeline,
        scope: body.scope,
        warranty: body.warranty,
        revisions: body.revisions,
        quote: body.quote,
        featured: body.featured,
        portfolioImages: body.portfolioImages,
      },
      include: {
        professional: true,
        request: true,
      },
    });

    return ok({ offer: updatedOffer });
  } catch (error) {
    return handleRouteError(error);
  }
}
