import { requireAuth, requireRole } from "@/lib/auth";
import { AppError, created, handleRouteError, parseRequestBody } from "@/lib/http";
import { ensureProjectAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { syncProfessionalReviewStats } from "@/lib/reviews";
import { createReviewSchema } from "@/lib/validations/review";

export async function POST(request: Request) {
  try {
    const auth = requireRole(await requireAuth(), ["CLIENT"]);
    const body = await parseRequestBody(request, createReviewSchema);
    const project = await ensureProjectAccess(body.projectId, auth);

    if (project.clientId !== auth.profile.id) {
      throw new AppError(403, "Само клиентът може да оставя отзив за този проект.");
    }

    if (project.status !== "COMPLETED") {
      throw new AppError(409, "Отзив може да се остави само за завършен проект.");
    }

    if (project.review) {
      throw new AppError(409, "За този проект вече има оставен отзив.");
    }

    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          projectId: project.id,
          reviewerId: auth.profile.id,
          professionalId: project.professionalId,
          rating: body.rating,
          comment: body.comment,
          images: body.images ?? [],
        },
      });

      await syncProfessionalReviewStats(tx, project.professionalId);

      return createdReview;
    });

    return created({ review });
  } catch (error) {
    return handleRouteError(error);
  }
}
