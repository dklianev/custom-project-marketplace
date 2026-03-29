import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";

type Params = { professionalId: string };

export async function GET(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const { professionalId } = await resolveRouteParams(context);
    const [reviews, aggregate] = await Promise.all([
      prisma.review.findMany({
        where: { professionalId },
        include: {
          reviewer: true,
          project: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.aggregate({
        where: { professionalId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return ok({
      reviews,
      summary: {
        rating: aggregate._avg.rating ?? 0,
        count: aggregate._count.rating,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
