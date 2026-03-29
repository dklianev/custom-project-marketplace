import { requireAuth } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();

    const [unreadMessages, pendingOffers, recentMessages, recentOffers] =
      await Promise.all([
        prisma.message.count({
          where: {
            read: false,
            senderId: { not: auth.profile.id },
            project:
              auth.profile.role === "CLIENT"
                ? { clientId: auth.profile.id }
                : { professionalId: auth.profile.id },
          },
        }),
        auth.profile.role === "CLIENT"
          ? prisma.offer.count({
              where: {
                status: "PENDING",
                request: {
                  clientId: auth.profile.id,
                },
              },
            })
          : Promise.resolve(0),
        prisma.message.findMany({
          where: {
            read: false,
            senderId: { not: auth.profile.id },
            project:
              auth.profile.role === "CLIENT"
                ? { clientId: auth.profile.id }
                : { professionalId: auth.profile.id },
          },
          include: {
            project: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        auth.profile.role === "CLIENT"
          ? prisma.offer.findMany({
              where: {
                status: "PENDING",
                request: {
                  clientId: auth.profile.id,
                },
              },
              include: {
                request: true,
                professional: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
          : Promise.resolve([]),
      ]);

    const notifications = [
      ...recentMessages.map((message) => ({
        id: `message:${message.id}`,
        title: `Ново съобщение по ${message.project.title}`,
        unread: true,
        createdAt: message.createdAt.toISOString(),
      })),
      ...recentOffers.map((offer) => ({
        id: `offer:${offer.id}`,
        title: `Нова оферта от ${offer.professional.name}`,
        unread: true,
        createdAt: offer.createdAt.toISOString(),
      })),
    ];

    return ok({
      unreadCount: unreadMessages + pendingOffers,
      notifications,
      counts: {
        unreadMessages,
        pendingOffers,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
