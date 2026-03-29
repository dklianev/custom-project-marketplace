"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getRequiredEnv } from "@/lib/env";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      getRequiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    );
  }

  return stripePromise;
}
