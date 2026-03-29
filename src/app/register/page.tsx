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
};

type RegisterResponse = {
  user?: AuthUser | null;
  error?: string;
  emailConfirmationRequired?: boolean;
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

function RegisterExperience() {
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: role === "professional" ? "PROFESSIONAL" : "CLIENT",
        }),
      });
      const payload = await readJson<RegisterResponse>(response);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не успяхме да създадем профила.");
      }

      if (payload?.emailConfirmationRequired) {
        const loginHref =
          `/login?registered=1&email=${encodeURIComponent(email)}` +
          (nextPath ? `&next=${encodeURIComponent(nextPath)}` : "") +
          `&role=${role}`;

        router.replace(loginHref);
        router.refresh();
        return;
      }

      if (!payload?.user) {
        throw new Error("Профилът беше създаден, но липсва потребителска сесия.");
      }

      setSession({
        userId: payload.user.id,
        role: payload.user.role,
        email: payload.user.email,
      });

      const fallbackDestination =
        payload.user.role === "PROFESSIONAL" ? "/pro/register" : "/dashboard";
      const destination = nextPath ?? fallbackDestination;

      router.replace(destination);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да създадем профила.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}&role=${role}`
    : `/login?role=${role}`;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-[-5%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-primary-fixed/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[26rem] w-[26rem] rounded-full bg-secondary-container/30 blur-[100px]" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-10 max-w-lg text-center">
          <Link
            href="/"
            className="mb-4 inline-block text-3xl font-black text-on-background"
          >
            Atelier
          </Link>
          <h1 className="text-4xl font-bold leading-tight text-on-background md:text-5xl">
            Създай профил за Atelier
          </h1>
          <p className="mt-3 text-base text-on-surface-variant">
            Влизаш в подреден пазар за доверени проекти и проверени
            професионалисти.
          </p>
        </div>

        <div className="mb-8 grid w-full max-w-lg grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setRole("client")}
            className={`glass-card flex flex-col items-center gap-4 rounded-[2rem] p-10 transition-[box-shadow,transform,ring-color] duration-200 ${
              role === "client"
                ? "ring-2 ring-primary"
                : "hover:ring-1 hover:ring-outline-variant"
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed/50">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-3xl text-on-primary-fixed"
              >
                person
              </span>
            </div>
            <span className="text-sm font-bold text-on-surface">Клиент</span>
            <span className="text-center text-xs text-on-surface-variant">
              Искам да изпратя заявка и да получа оферти.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setRole("professional")}
            className={`glass-card flex flex-col items-center gap-4 rounded-[2rem] p-10 transition-[box-shadow,transform,ring-color] duration-200 ${
              role === "professional"
                ? "ring-2 ring-primary"
                : "hover:ring-1 hover:ring-outline-variant"
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed/50">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-3xl text-on-primary-fixed"
              >
                handyman
              </span>
            </div>
            <span className="text-sm font-bold text-on-surface">
              Професионалист
            </span>
            <span className="text-center text-xs text-on-surface-variant">
              Искам да кандидатствам и да получавам подбрани заявки.
            </span>
          </button>
        </div>

        <div className="w-full max-w-lg rounded-[2rem] bg-surface-container-low p-12 shadow-[0_24px_70px_rgba(110,86,120,0.12)]">
          {error ? (
            <div className="mb-5 rounded-[1.5rem] bg-rose-100/80 px-4 py-4 text-sm font-medium text-rose-700" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="register-name"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Име и фамилия
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Иван Петров"
                autoComplete="name"
                required
                disabled={isSubmitting}
                className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Имейл адрес
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Парола
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Минимум 8 символа"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  className="w-full rounded-[1.25rem] bg-surface-container-lowest px-4 py-3 pr-12 text-sm text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-xl"
                  >
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-6 text-sm font-bold uppercase tracking-widest text-on-primary shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Създаваме профила..." : "Създай профил"}
              <span aria-hidden="true" className="material-symbols-outlined text-xl">
                arrow_forward
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Вече имаш профил?{" "}
            <Link
              href={loginHref}
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Влез сега
            </Link>
          </p>
        </div>

        <div className="mt-12 w-full max-w-lg overflow-hidden rounded-[2rem]">
          <Image
            src="/auth-onboarding.svg"
            alt="Atelier onboarding"
            width={600}
            height={400}
            priority
            sizes="(min-width: 1024px) 32rem, (min-width: 768px) 28rem, 100vw"
            className="h-auto w-full rounded-[2rem] object-cover"
          />
        </div>
      </div>

      <footer className="relative z-10 flex w-full items-center justify-center px-12 py-8">
        <div className="flex items-center gap-8">
          <Link
            href="/privacy"
            className="text-[10px] font-bold uppercase tracking-widest text-outline transition-colors hover:text-primary"
          >
            Поверителност
          </Link>
          <div className="h-1 w-1 rounded-full bg-outline-variant" />
          <Link
            href="/terms"
            className="text-[10px] font-bold uppercase tracking-widest text-outline transition-colors hover:text-primary"
          >
            Условия
          </Link>
          <div className="h-1 w-1 rounded-full bg-outline-variant" />
          <Link
            href="/contact"
            className="text-[10px] font-bold uppercase tracking-widest text-outline transition-colors hover:text-primary"
          >
            Контакт
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterExperience />
    </Suspense>
  );
}
