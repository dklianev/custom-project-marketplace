import { requireAuth } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { ensurePaymentAccess } from "@/lib/marketplace";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const payment = await ensurePaymentAccess(id, auth);
    return ok({ payment });
  } catch (error) {
    return handleRouteError(error);
  }
}
