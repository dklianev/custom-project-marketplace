import { requireAuth } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { ensurePaymentAccess } from "@/lib/marketplace";
import { createSimplePdf } from "@/lib/pdf";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string };

export async function GET(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const payment = await ensurePaymentAccess(id, auth);
    const url = new URL(request.url);

    if (url.searchParams.get("format") === "json") {
      return ok({
        receipt: {
          paymentId: payment.id,
          invoiceNumber: payment.invoiceNumber,
          issuedAt: payment.createdAt.toISOString(),
          amount: payment.amount,
          serviceFee: payment.serviceFee,
          total: payment.total,
          currency: payment.currency,
          status: payment.status,
          projectTitle: payment.project.title,
          client: payment.client.name,
          professional: payment.project.professional.name,
        },
      });
    }

    const pdf = createSimplePdf("Atelier Receipt", [
      `Receipt No: ${payment.invoiceNumber ?? payment.id}`,
      `Issued At: ${payment.createdAt.toISOString()}`,
      `Project: ${payment.project.title}`,
      `Client: ${payment.client.name}`,
      `Professional: ${payment.project.professional.name}`,
      `Amount: ${payment.amount.toFixed(2)} ${payment.currency}`,
      `Service Fee: ${payment.serviceFee.toFixed(2)} ${payment.currency}`,
      `Total: ${payment.total.toFixed(2)} ${payment.currency}`,
      `Status: ${payment.status}`,
    ]);

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="atelier-receipt-${payment.invoiceNumber ?? payment.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
