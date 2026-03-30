import { getAuthContext, requireAuth } from "@/lib/auth";
import { AppError, handleRouteError, ok, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/auth";

export async function GET() {
  try {
    const auth = await getAuthContext();
    return ok({ user: auth?.profile ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await parseRequestBody(request, updateProfileSchema);

    if (
      body.experience !== undefined &&
      auth.profile.role !== "PROFESSIONAL"
    ) {
      throw new AppError(
        403,
        "Само професионалисти могат да обновяват опит и портфолио.",
      );
    }

    const user = await prisma.user.update({
      where: { id: auth.profile.id },
      data: {
        name: body.name,
        avatarUrl: body.avatarUrl,
        phone: body.phone,
        bio: body.bio,
        location: body.location,
        skills: body.skills,
        experience: body.experience,
        certificates: body.certificates,
        portfolioImages: body.portfolioImages,
      },
    });

    return ok({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
