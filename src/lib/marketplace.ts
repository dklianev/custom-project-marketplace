import type { AuthContext } from "@/lib/auth";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const professionalReadableStatuses = new Set([
  "MATCHING",
  "OFFERS_RECEIVED",
]);

export function buildRequestTitle(description: string): string {
  const firstSentence = description.split(/[.!?]/, 1)[0]?.trim();
  if (!firstSentence) {
    return "Нова заявка в Atelier";
  }

  return firstSentence.slice(0, 72);
}

export function calculatePaymentBreakdown(amount: number) {
  const serviceFee = 45;
  const total = Number((amount + serviceFee).toFixed(2));
  return { serviceFee, total };
}

export function generateInvoiceNumber() {
  return `ATL-${Math.floor(Date.now() / 1000)}`;
}

export async function getRequestOrThrow(requestId: string) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      client: true,
      attachments: true,
      offers: {
        include: {
          professional: true,
        },
        orderBy: [{ featured: "desc" }, { price: "asc" }],
      },
      project: true,
    },
  });

  if (!request) {
    throw new AppError(404, "Заявката не е намерена.");
  }

  return request;
}

export async function ensureRequestAccess(requestId: string, auth: AuthContext) {
  const request = await getRequestOrThrow(requestId);
  const isOwner = request.clientId === auth.profile.id;
  const hasOffer = request.offers.some(
    (offer) => offer.professionalId === auth.profile.id,
  );
  const canBrowseAsProfessional =
    auth.profile.role === "PROFESSIONAL" &&
    professionalReadableStatuses.has(request.status);

  if (!isOwner && !hasOffer && !canBrowseAsProfessional) {
    throw new AppError(403, "Нямате достъп до тази заявка.");
  }

  return request;
}

export async function ensureRequestOwner(requestId: string, auth: AuthContext) {
  const request = await getRequestOrThrow(requestId);
  if (request.clientId !== auth.profile.id) {
    throw new AppError(403, "Само собственикът на заявката може да извърши това действие.");
  }

  return request;
}

export async function getOfferOrThrow(offerId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      professional: true,
      request: {
        include: {
          client: true,
          project: true,
          offers: {
            include: {
              professional: true,
            },
            orderBy: [{ featured: "desc" }, { price: "asc" }],
          },
        },
      },
      project: true,
    },
  });

  if (!offer) {
    throw new AppError(404, "Офертата не е намерена.");
  }

  return offer;
}

export async function ensureOfferAccess(offerId: string, auth: AuthContext) {
  const offer = await getOfferOrThrow(offerId);
  const isClientOwner = offer.request.clientId === auth.profile.id;
  const isProfessionalOwner = offer.professionalId === auth.profile.id;

  if (!isClientOwner && !isProfessionalOwner) {
    throw new AppError(403, "Нямате достъп до тази оферта.");
  }

  return offer;
}

export async function getProjectOrThrow(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      request: true,
      offer: {
        include: {
          professional: true,
        },
      },
      client: true,
      professional: true,
      milestones: {
        orderBy: { order: "asc" },
      },
      messages: {
        include: {
          sender: true,
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: true,
      payment: true,
      review: true,
    },
  });

  if (!project) {
    throw new AppError(404, "Проектът не е намерен.");
  }

  return project;
}

export async function ensureProjectAccess(projectId: string, auth: AuthContext) {
  const project = await getProjectOrThrow(projectId);
  const isParticipant =
    project.clientId === auth.profile.id ||
    project.professionalId === auth.profile.id;

  if (!isParticipant) {
    throw new AppError(403, "Нямате достъп до този проект.");
  }

  return project;
}

export async function ensurePaymentAccess(paymentId: string, auth: AuthContext) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      client: true,
      project: {
        include: {
          professional: true,
          request: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(404, "Плащането не е намерено.");
  }

  const isParticipant =
    payment.clientId === auth.profile.id ||
    payment.project.professionalId === auth.profile.id;

  if (!isParticipant) {
    throw new AppError(403, "Нямате достъп до това плащане.");
  }

  return payment;
}
