import { AppError } from "@/lib/http";
import { requireAuth } from "@/lib/auth";
import {
  ensureOfferAccess,
  ensurePaymentAccess,
} from "@/lib/marketplace";
import {
  buildRequestDraft,
  type RequestDraft,
} from "@/lib/request-flow";
import {
  PaymentCheckout,
  type CheckoutOffer,
  type CheckoutPayment,
  type CheckoutState,
} from "@/components/payment-checkout";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return takeFirst(value[0]);
  }

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toDraft(searchParams: Record<string, string | string[] | undefined>): RequestDraft {
  return buildRequestDraft({
    query: takeFirst(searchParams.query) ?? takeFirst(searchParams.q) ?? undefined,
    city: takeFirst(searchParams.city) ?? undefined,
    budget: takeFirst(searchParams.budget) ?? undefined,
    timeline: takeFirst(searchParams.timeline) ?? undefined,
    scope: takeFirst(searchParams.scope) ?? undefined,
    priority: takeFirst(searchParams.priority) ?? undefined,
    style: takeFirst(searchParams.style) ?? undefined,
    notes: takeFirst(searchParams.notes) ?? undefined,
  });
}

function serializeOffer(offer: Awaited<ReturnType<typeof ensureOfferAccess>>): CheckoutOffer {
  return {
    id: offer.id,
    status: offer.status,
    price: offer.price,
    timeline: offer.timeline,
    scope: offer.scope,
    warranty: offer.warranty,
    revisions: offer.revisions,
    professional: {
      id: offer.professional.id,
      name: offer.professional.name,
      avatarUrl: offer.professional.avatarUrl,
      location: offer.professional.location,
      verified: offer.professional.verified,
      rating: offer.professional.rating,
      reviewCount: offer.professional.reviewCount,
    },
    request: {
      id: offer.request.id,
      title: offer.request.title,
      description: offer.request.description,
      budget: offer.request.budget,
      timeline: offer.request.timeline,
      location: offer.request.location,
    },
    project: offer.project ? { id: offer.project.id } : null,
  };
}

function serializePayment(payment: Awaited<ReturnType<typeof ensurePaymentAccess>>): CheckoutPayment {
  return {
    id: payment.id,
    total: payment.total,
    amount: payment.amount,
    serviceFee: payment.serviceFee,
    currency: payment.currency,
    status: payment.status,
    invoiceNumber: payment.invoiceNumber,
    project: {
      id: payment.project.id,
      title: payment.project.title,
      request: {
        title: payment.project.request.title,
        description: payment.project.request.description,
        budget: payment.project.request.budget,
        timeline: payment.project.request.timeline,
        location: payment.project.request.location,
      },
      professional: {
        id: payment.project.professional.id,
        name: payment.project.professional.name,
        avatarUrl: payment.project.professional.avatarUrl,
        location: payment.project.professional.location,
        verified: payment.project.professional.verified,
      },
    },
  };
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const offerId =
    takeFirst(resolvedSearchParams.offer) ??
    takeFirst(resolvedSearchParams.offerId);
  const paymentId = takeFirst(resolvedSearchParams.paymentId);
  const initialDraft = toDraft(resolvedSearchParams);

  let initialState: CheckoutState = { offer: null, payment: null };
  let initialError: string | null = null;

  if (!offerId && !paymentId) {
    initialError = "Липсва оферта или плащане за този екран.";
  } else {
    try {
      const auth = await requireAuth();
      const [offer, payment] = await Promise.all([
        offerId ? ensureOfferAccess(offerId, auth) : Promise.resolve(null),
        paymentId ? ensurePaymentAccess(paymentId, auth) : Promise.resolve(null),
      ]);

      initialState = {
        offer: offer ? serializeOffer(offer) : null,
        payment: payment ? serializePayment(payment) : null,
      };
    } catch (error) {
      initialError =
        error instanceof AppError
          ? error.message
          : "Не успяхме да заредим данните за плащането.";
    }
  }

  return (
    <PaymentCheckout
      offerId={offerId}
      paymentId={paymentId}
      initialDraft={initialDraft}
      initialState={initialState}
      initialError={initialError}
    />
  );
}
