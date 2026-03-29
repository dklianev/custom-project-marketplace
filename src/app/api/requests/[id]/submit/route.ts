import { requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok } from "@/lib/http";
import { ensureRequestOwner } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { id: string };

export async function POST(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const existing = await ensureRequestOwner(id, auth);

    if (!["DRAFT", "PENDING"].includes(existing.status)) {
      throw new AppError(409, "Тази заявка не може да бъде изпратена.");
    }

    const request = await prisma.request.update({
      where: { id: existing.id },
      data: {
        status: "MATCHING",
      },
    });

    return ok({ request });
  } catch (error) {
    return handleRouteError(error);
  }
}
