import { cache } from "react";
import { prisma } from "@/lib/prisma";

const REQUEST_ARTWORKS = {
  DRAFT: "/editorial/request-waiting.svg",
  PENDING: "/editorial/request-waiting.svg",
  MATCHING: "/editorial/request-waiting.svg",
  OFFERS_RECEIVED: "/editorial/request-active.svg",
  IN_PROGRESS: "/editorial/project-concept.svg",
  COMPLETED: "/editorial/portfolio-02.svg",
  CANCELLED: "/editorial/request-waiting.svg",
} as const;

const PROFESSIONAL_FALLBACKS = [
  "/editorial/artisan-ceramic.svg",
  "/editorial/artisan-leather.svg",
  "/editorial/artisan-textile.svg",
  "/editorial/artisan-jewelry.svg",
] as const;

export function pickRequestArtwork(status: string, index: number) {
  if (status in REQUEST_ARTWORKS) {
    return REQUEST_ARTWORKS[status as keyof typeof REQUEST_ARTWORKS];
  }

  return PROFESSIONAL_FALLBACKS[index % PROFESSIONAL_FALLBACKS.length];
}

export function pickProfessionalArtwork(images: string[], index: number) {
  return images[0] ?? PROFESSIONAL_FALLBACKS[index % PROFESSIONAL_FALLBACKS.length];
}

export const getCustomerRequestsWorkspace = cache(async (clientId: string) => {
  return prisma.request.findMany({
    where: {
      clientId,
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      budget: true,
      timeline: true,
      location: true,
      createdAt: true,
      updatedAt: true,
      offers: {
        orderBy: [{ featured: "desc" }, { price: "asc" }],
        select: {
          id: true,
          price: true,
          timeline: true,
          status: true,
          featured: true,
          professional: {
            select: {
              id: true,
              name: true,
              verified: true,
              rating: true,
              reviewCount: true,
              location: true,
              portfolioImages: true,
              skills: true,
            },
          },
        },
      },
      project: {
        select: {
          id: true,
          offerId: true,
          status: true,
          progress: true,
          updatedAt: true,
          deadline: true,
          review: { select: { id: true } },
          payment: { select: { id: true, status: true, total: true } },
          professional: {
            select: {
              id: true,
              name: true,
              verified: true,
              rating: true,
              reviewCount: true,
              location: true,
              portfolioImages: true,
            },
          },
          milestones: {
            orderBy: [{ order: "asc" }],
            select: {
              id: true,
              title: true,
              order: true,
              completed: true,
            },
          },
        },
      },
    },
  });
});

export const getFeaturedProfessionals = cache(async () => {
  return prisma.user.findMany({
    where: {
      role: "PROFESSIONAL",
      verified: true,
    },
    orderBy: [{ reviewCount: "desc" }, { rating: "desc" }],
    take: 4,
    select: {
      id: true,
      name: true,
      location: true,
      skills: true,
      rating: true,
      reviewCount: true,
      portfolioImages: true,
      verified: true,
      experience: true,
    },
  });
});

export const getRequestsMarketplaceProof = cache(async () => {
  const [verifiedProfessionals, completedProjects, publishedReviews] = await Promise.all([
    prisma.user.count({ where: { role: "PROFESSIONAL", verified: true } }),
    prisma.project.count({ where: { status: "COMPLETED" } }),
    prisma.review.count(),
  ]);

  return {
    verifiedProfessionals,
    completedProjects,
    publishedReviews,
  };
});
