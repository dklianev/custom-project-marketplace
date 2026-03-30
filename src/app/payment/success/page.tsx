import {
  PaymentSuccessExperience,
  type PaymentSuccessData,
} from "@/components/payment-success-experience";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/http";
import { ensurePaymentAccess } from "@/lib/marketplace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function serializePayment(
  payment: Awaited<ReturnType<typeof ensurePaymentAccess>>,
): PaymentSuccessData {
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
        name: payment.project.professional.name,
        avatarUrl: payment.project.professional.avatarUrl,
        verified: payment.project.professional.verified,
      },
    },
  };
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const paymentId = takeFirst(params.paymentId) ?? takeFirst(params.id) ?? null;

  let initialPayment: PaymentSuccessData | null = null;
  let initialError: string | null = null;

  if (!paymentId) {
    initialError = "Липсва идентификатор на плащането.";
  } else {
    try {
      const auth = await requireAuth();
      const payment = await ensurePaymentAccess(paymentId, auth);
      initialPayment = serializePayment(payment);
    } catch (error) {
      initialError =
        error instanceof AppError
          ? error.message
          : "Не успяхме да заредим потвърждението за плащането.";
    }
  }

  return (
    <PaymentSuccessExperience
      initialPayment={initialPayment}
      initialError={initialError}
    />
  );
}
