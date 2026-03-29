import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicRoutes = ["/login", "/register", "/pro/register"];
const protectedPrefixes = [
  "/dashboard",
  "/offers",
  "/requests",
  "/project",
  "/review",
  "/payment",
];
const professionalPrefix = "/pro";

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicPath(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const role =
    typeof user?.user_metadata?.role === "string" &&
    user.user_metadata.role.trim().toUpperCase() === "PROFESSIONAL"
      ? "PROFESSIONAL"
      : "CLIENT";

  if (pathname === "/pro/register" || pathname.startsWith("/pro/register/")) {
    if (user && role !== "PROFESSIONAL") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  }

  if (
    pathname.startsWith(professionalPrefix) &&
    !user
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    pathname.startsWith(professionalPrefix) &&
    role !== "PROFESSIONAL"
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath(pathname) && user) {
    const destination = role === "PROFESSIONAL" ? "/pro/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
