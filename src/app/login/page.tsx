"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

type Role = "client" | "professional";

type AuthUser = {
  id: string;
  role: "CLIENT" | "PROFESSIONAL";
  email: string;
  name?: string | null;
};

type ApiPayload = {
  user?: AuthUser | null;
  error?: string;
};

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function LoginExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const [role, setRole] = useState<Role>(
    searchParams.get("role") === "professional" ? "professional" : "client",
  );
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchCurrentUser() {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      method: "GET",
    });
    const payload = await readJson<ApiPayload>(response);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не успяхме да заредим профила ти.");
    }

    return payload?.user ?? null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await readJson<ApiPayload>(response);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не успяхме да те впишем.");
      }

      const user = payload?.user ?? (await fetchCurrentUser());
      if (!user) {
        throw new Error("Профилът не беше върнат коректно след вход.");
      }

      setSession({
        userId: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      });

      const destination =
        nextPath ??
        (user.role === "PROFESSIONAL" ? "/pro/dashboard" : "/dashboard");

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да те впишем.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const registerHref = nextPath
    ? `/register?next=${encodeURIComponent(nextPath)}&role=${role}`
    : `/register?role=${role}`;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-[38rem] w-[38rem]"
        style={{
          background: "radial-gradient(circle, rgba(246,217,255,0.62) 0%, transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-[32rem] w-[32rem]"
        style={{
          background: "radial-gradient(circle, rgba(212,222,255,0.42) 0%, transparent 70%)",
        }}
      />

      <div className="absolute bottom-20 left-20 hidden h-80 w-64 rotate-[-3deg] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_rgba(70,57,90,0.18)] lg:block">
        <Image
          src="/auth-professionals.svg"
          alt="Atelier professionals"
          fill
          priority
          sizes="16rem"
          className="object-cover"
        />
      </div>

      <div className="absolute right-24 top-24 hidden h-48 w-72 rotate-[2deg] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_rgba(70,57,90,0.18)] lg:block">
        <Image
          src="/auth-moodboard.svg"
          alt="Atelier moodboard"
          fill
          priority
          sizes="18rem"
          className="object-cover"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-primary">Atelier</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Вход към доверения пазар
          </p>
        </div>

        <div className="rounded-[2rem] bg-white/76 p-10 shadow-[0_24px_70px_rgba(110,86,120,0.12)] backdrop-blur-xl">
          <div className="mb-8 flex rounded-full bg-surface-container-low p-1.5">
            <button
              type="button"
              onClick={() => setRole("client")}
              aria-pressed={role === "client"}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                role === "client"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Клиент
            </button>
            <button
              type="button"
              onClick={() => setRole("professional")}
              aria-pressed={role === "professional"}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                role === "professional"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Професионалист
            </button>
          </div>

          {searchParams.get("registered") === "1" ? (
            <div className="mb-5 rounded-[1.5rem] bg-primary/10 px-4 py-4 text-sm font-medium text-primary" role="status" aria-live="polite">
              Профилът е създаден. Влез, за да продължим към Atelier.
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-[1.5rem] bg-rose-100/80 px-4 py-4 text-sm font-medium text-rose-700" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-on-surface"
              >
                Имейл адрес
              </label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant"
                >
                  alternate_email
                </span>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-[1.25rem] bg-surface-container-low py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-on-surface"
                >
                  Парола
                </label>
                <span className="text-xs font-medium text-primary/70">
                  Използвай паролата от профила си в Supabase.
                </span>
              </div>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant"
                >
                  lock
                </span>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Въведи паролата си"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-[1.25rem] bg-surface-container-low py-3 pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-5 text-lg font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Влизаме..." : "Влез в Atelier"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Още нямаш профил?{" "}
            <Link
              href={registerHref}
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Създай акаунт →
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-on-surface-variant/60">
          &copy; 2026 Atelier. Подредено насочване за доверени проекти.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginExperience />
    </Suspense>
  );
}
