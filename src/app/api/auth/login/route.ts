import { AppError, handleRouteError, ok, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  try {
    const body = await parseRequestBody(request, loginSchema);
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      throw new AppError(400, "Невалиден имейл или парола.");
    }

    if (!data.user?.id) {
      throw new AppError(401, "Неуспешен вход.");
    }

    const profile = await prisma.user.findUnique({
      where: { supabaseId: data.user.id },
    });

    return ok({
      user: profile,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
