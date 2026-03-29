import type { Prisma } from "@prisma/client";

export async function syncProfessionalReviewStats(
  tx: Prisma.TransactionClient,
  professionalId: string,
) {
  const aggregate = await tx.review.aggregate({
    where: { professionalId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return tx.user.update({
    where: { id: professionalId },
    data: {
      rating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
    },
  });
}
