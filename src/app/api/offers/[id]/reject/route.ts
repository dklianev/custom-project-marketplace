import { requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok } from "@/lib/http";
import { ensureOfferAccess } from "@/lib/marketplace";
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
    const offer = await ensureOfferAccess(id, auth);

    if (offer.request.clientId !== auth.profile.id) {
      throw new AppError(403, "Само собственикът на заявката може да отхвърли оферта.");
    }

    if (offer.status !== "PENDING") {
      throw new AppError(409, "Само чакащи оферти могат да бъдат отхвърлени.");
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: { status: "REJECTED" },
    });

    return ok({ offer: updatedOffer });
  } catch (error) {
    return handleRouteError(error);
  }
}
