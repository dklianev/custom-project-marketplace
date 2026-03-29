import Stripe from "stripe";
import { getRequiredEnv } from "@/lib/env";

const globalForStripe = globalThis as typeof globalThis & {
  stripe?: Stripe;
};

export function getStripeServer(): Stripe {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2026-03-25.dahlia",
    });
  }

  return globalForStripe.stripe;
}
