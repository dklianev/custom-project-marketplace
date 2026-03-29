import { requireAuth } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();
    const projects = await prisma.project.findMany({
      where:
        auth.profile.role === "CLIENT"
          ? { clientId: auth.profile.id }
          : { professionalId: auth.profile.id },
      include: {
        request: true,
        offer: true,
        client: true,
        professional: true,
        milestones: {
          orderBy: { order: "asc" },
        },
        payment: true,
        review: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return ok({ projects });
  } catch (error) {
    return handleRouteError(error);
  }
}
