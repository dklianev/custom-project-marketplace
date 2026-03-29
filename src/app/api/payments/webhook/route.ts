import Stripe from "stripe";
import { handleRouteError, ok, AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getStripeServer } from "@/lib/stripe/server";
import { getRequiredEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new AppError(400, "Липсва Stripe подпис.");
    }

    const body = await request.text();
    const stripe = getStripeServer();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.id) {
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: {
              status: "COMPLETED",
              stripePaymentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : null,
              paidAmount: session.amount_total ? session.amount_total / 100 : undefined,
              remainingAmount: 0,
            },
          });
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.id) {
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: {
              status: "FAILED",
            },
          });
        }
        break;
      }
      default:
        break;
    }

    return ok({ received: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
