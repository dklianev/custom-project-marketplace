import { requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok } from "@/lib/http";
import {
  calculatePaymentBreakdown,
  ensureOfferAccess,
  generateInvoiceNumber,
} from "@/lib/marketplace";
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
      throw new AppError(403, "Само собственикът на заявката може да приеме оферта.");
    }

    if (offer.status !== "PENDING") {
      throw new AppError(409, "Само чакащи оферти могат да бъдат приети.");
    }

    if (offer.request.project || offer.project) {
      throw new AppError(409, "Тази оферта вече има проект.");
    }

    const { serviceFee, total } = calculatePaymentBreakdown(offer.price);

    const result = await prisma.$transaction(async (tx) => {
      const acceptedOffer = await tx.offer.update({
        where: { id: offer.id },
        data: { status: "ACCEPTED" },
      });

      await tx.offer.updateMany({
        where: {
          requestId: offer.requestId,
          id: { not: offer.id },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      await tx.request.update({
        where: { id: offer.requestId },
        data: { status: "IN_PROGRESS" },
      });

      const project = await tx.project.create({
        data: {
          requestId: offer.requestId,
          offerId: offer.id,
          clientId: offer.request.clientId,
          professionalId: offer.professionalId,
          title: offer.request.title,
          status: "CREATED",
          progress: 0,
        },
      });

      const payment = await tx.payment.create({
        data: {
          projectId: project.id,
          clientId: offer.request.clientId,
          amount: offer.price,
          serviceFee,
          total,
          status: "PENDING",
          invoiceNumber: generateInvoiceNumber(),
          remainingAmount: total,
        },
      });

      return { acceptedOffer, project, payment };
    });

    return ok({
      ...result,
      nextUrl: `/payment?offerId=${offer.id}&paymentId=${result.payment.id}&requestId=${offer.requestId}`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
