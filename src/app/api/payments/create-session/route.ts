import { requireAuth, requireRole } from "@/lib/auth";
import { AppError, created, handleRouteError, ok, parseRequestBody } from "@/lib/http";
import {
  calculatePaymentBreakdown,
  ensureOfferAccess,
  generateInvoiceNumber,
} from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { getStripeServer } from "@/lib/stripe/server";
import { createPaymentSessionSchema } from "@/lib/validations/payment";
import { getAppUrl } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const auth = requireRole(await requireAuth(), ["CLIENT"]);
    const body = await parseRequestBody(request, createPaymentSessionSchema);
    const offer = await ensureOfferAccess(body.offerId, auth);

    if (offer.request.clientId !== auth.profile.id) {
      throw new AppError(403, "Само собственикът на заявката може да създаде платежна сесия.");
    }

    if (offer.status !== "ACCEPTED") {
      throw new AppError(409, "Само приети оферти могат да бъдат платени.");
    }

    const project =
      offer.project ??
      (await prisma.project.findUnique({
        where: { offerId: offer.id },
      }));

    if (!project) {
      throw new AppError(409, "Липсва проект за тази оферта.");
    }

    const stripe = getStripeServer();
    const existingPayment = await prisma.payment.findUnique({
      where: { projectId: project.id },
    });

    if (existingPayment?.status === "COMPLETED") {
      return ok({
        checkoutUrl: null,
        payment: existingPayment,
      });
    }

    if (existingPayment?.stripeSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(existingPayment.stripeSessionId);

        if (existingSession.status === "open" && existingSession.url) {
          return ok({
            sessionId: existingSession.id,
            checkoutUrl: existingSession.url,
            payment: existingPayment,
          });
        }
      } catch {
        // Create a fresh session when Stripe no longer recognizes the previous one.
      }
    }

    const { serviceFee, total } = calculatePaymentBreakdown(offer.price);
    const payment =
      existingPayment ??
      (await prisma.payment.create({
        data: {
          projectId: project.id,
          clientId: auth.profile.id,
          amount: offer.price,
          serviceFee,
          total,
          status: "PENDING",
          invoiceNumber: generateInvoiceNumber(),
          remainingAmount: total,
        },
      }));

    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: payment.currency.toLowerCase(),
      success_url:
        body.successUrl ?? `${appUrl}/payment/success?paymentId=${payment.id}`,
      cancel_url: body.cancelUrl ?? `${appUrl}/payment?offerId=${offer.id}`,
      metadata: {
        paymentId: payment.id,
        projectId: project.id,
        offerId: offer.id,
        requestId: offer.requestId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency.toLowerCase(),
            unit_amount: Math.round(payment.amount * 100),
            product_data: {
              name: offer.request.title,
              description: "Плащане за професионална услуга",
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: payment.currency.toLowerCase(),
            unit_amount: Math.round(payment.serviceFee * 100),
            product_data: {
              name: "Такса платформа Atelier",
            },
          },
        },
      ],
    });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PROCESSING",
        stripeSessionId: session.id,
      },
    });

    return created({
      sessionId: session.id,
      checkoutUrl: session.url,
      payment: updatedPayment,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
