import { PaymentSuccessExperience } from "@/components/payment-success-experience";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const paymentId = takeFirst(params.paymentId) ?? takeFirst(params.id) ?? null;

  return <PaymentSuccessExperience paymentId={paymentId} />;
}
