import type { User as PrismaUser } from "@prisma/client";
import type {
  SupabaseClient,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "CLIENT" | "PROFESSIONAL";

export interface AuthContext {
  authUser: SupabaseUser;
  profile: PrismaUser;
  supabase: SupabaseClient;
}

function normalizeRole(value: unknown): AppRole {
  if (typeof value !== "string") {
    return "CLIENT";
  }

  const normalized = value.trim().toUpperCase();
  return normalized === "PROFESSIONAL" ? "PROFESSIONAL" : "CLIENT";
}

function inferName(authUser: SupabaseUser): string {
  const metadataName = authUser.user_metadata?.name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  const email = authUser.email ?? "atelier-user@example.com";
  return email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Atelier User";
}

async function ensureProfile(authUser: SupabaseUser): Promise<PrismaUser> {
  const email = authUser.email;
  if (!email) {
    throw new AppError(400, "Липсва имейл адрес за удостоверения потребител.");
  }

  return prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: {
      email,
      name: inferName(authUser),
      role: normalizeRole(authUser.user_metadata?.role),
      avatarUrl:
        typeof authUser.user_metadata?.avatar_url === "string"
          ? authUser.user_metadata.avatar_url
          : null,
    },
    create: {
      supabaseId: authUser.id,
      email,
      name: inferName(authUser),
      role: normalizeRole(authUser.user_metadata?.role),
      avatarUrl:
        typeof authUser.user_metadata?.avatar_url === "string"
          ? authUser.user_metadata.avatar_url
          : undefined,
    },
  });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const profile = await ensureProfile(data.user);
  return {
    authUser: data.user,
    profile,
    supabase,
  };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) {
    throw new AppError(401, "Нужна е активна сесия.");
  }

  return auth;
}

export function requireRole(auth: AuthContext, roles: AppRole[]): AuthContext {
  if (!roles.includes(auth.profile.role)) {
    throw new AppError(403, "Нямате достъп до този ресурс.");
  }

  return auth;
}
