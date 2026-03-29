import { requireAuth } from "@/lib/auth";
import {
  AppError,
  handleRouteError,
  noContent,
  ok,
  parseRequestBody,
} from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { syncProfessionalReviewStats } from "@/lib/reviews";
import { resolveRouteParams, type RouteContext } from "@/lib/route-context";
import { updateReviewSchema } from "@/lib/validations/review";

type Params = { id: string };

export async function PATCH(
  request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);
    const body = await parseRequestBody(request, updateReviewSchema);

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!review) {
      throw new AppError(404, "Отзивът не е намерен.");
    }

    if (review.reviewerId !== auth.profile.id) {
      throw new AppError(403, "Само авторът може да редактира този отзив.");
    }

    const updatedReview = await prisma.$transaction(async (tx) => {
      const nextReview = await tx.review.update({
        where: { id },
        data: {
          rating: body.rating,
          comment: body.comment,
          images: body.images,
        },
      });

      await syncProfessionalReviewStats(tx, review.professionalId);
      return nextReview;
    });

    return ok({ review: updatedReview });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<Params>,
) {
  try {
    const auth = await requireAuth();
    const { id } = await resolveRouteParams(context);

    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError(404, "Отзивът не е намерен.");
    }

    if (review.reviewerId !== auth.profile.id) {
      throw new AppError(403, "Само авторът може да изтрие този отзив.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id },
      });
      await syncProfessionalReviewStats(tx, review.professionalId);
    });

    return noContent();
  } catch (error) {
    return handleRouteError(error);
  }
}
