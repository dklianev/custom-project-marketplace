import { requireAuth } from "@/lib/auth";
import { ensureRequestAccess } from "@/lib/marketplace";
import { handleRouteError, ok } from "@/lib/http";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { requestId: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { requestId } = await resolveRouteParams(context);
    const request = await ensureRequestAccess(requestId, auth);

    return ok({
      request: {
        id: request.id,
        title: request.title,
        status: request.status,
      },
      offers: request.offers.slice(0, 3),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
