import { created, handleRouteError, parseRequestBody, AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, registerSchema);
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name,
          role: body.role,
        },
      },
    });

    if (error) {
      const message = error.message.toLowerCase().includes("already")
        ? "Този имейл вече е регистриран."
        : "Не успяхме да създадем профила.";
      throw new AppError(400, message);
    }

    const authUser = data.user;
    if (!authUser?.id || !authUser.email) {
      throw new AppError(500, "Supabase не върна потребителски профил.");
    }

    const profile = await prisma.user.upsert({
      where: { supabaseId: authUser.id },
      update: {
        email: authUser.email,
        name: body.name,
        role: body.role,
      },
      create: {
        supabaseId: authUser.id,
        email: authUser.email,
        name: body.name,
        role: body.role,
      },
    });

    return created({
      user: profile,
      emailConfirmationRequired: !data.session,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
