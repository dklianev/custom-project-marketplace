"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

type FooterProfile = {
  name: string;
  role: "CLIENT" | "PROFESSIONAL";
};

const navLinks = [
  { label: "Как работи", href: "/#how-it-works" },
  { label: "Нова заявка", href: "/request/create" },
  { label: "Сравнение на оферти", href: "/offers/compare" },
];

const processLinks = [
  { label: "Моите заявки", href: "/requests" },
  { label: "Табло на клиента", href: "/dashboard" },
  { label: "Табло на изпълнителя", href: "/pro/dashboard" },
];

export function Footer() {
  const [profile, setProfile] = useState<FooterProfile | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setProfile(null);
          return;
        }

        const payload = (await response.json()) as {
          user?: { name?: string | null; role?: "CLIENT" | "PROFESSIONAL" } | null;
        };

        if (!payload.user?.role) {
          setProfile(null);
          return;
        }

        setProfile({
          name: payload.user.name?.trim() || "Профил",
          role: payload.user.role,
        });
      } catch {
        setProfile(null);
      }
    }

    void loadProfile();

    return () => controller.abort();
  }, [pathname]);

  const dashboardHref =
    profile?.role === "PROFESSIONAL" ? "/pro/dashboard" : "/dashboard";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearSession();
      setProfile(null);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <footer className="mt-24 px-6 pb-12 md:px-10 md:pb-16">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.6rem] bg-[radial-gradient(circle_at_top_left,rgba(223,213,239,0.7),rgba(248,244,251,0.92)_42%,rgba(255,255,255,0.98)_100%)] px-7 py-8 shadow-[0_30px_90px_rgba(77,66,96,0.08)] md:px-10 md:py-10 lg:px-12 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
          <div className="max-w-xl">
            <span className="block text-3xl font-black tracking-[-0.06em] text-on-surface md:text-[2.4rem]">
              Atelier
            </span>
            <p className="mt-4 max-w-lg text-sm leading-7 text-on-surface-variant md:text-base md:leading-8">
              AI маркетплейс за заявки, оферти и проверени професионалисти. Atelier подрежда проекта,
              намалява шума и помага да стигнеш до спокойно решение.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/request/create"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_16px_34px_rgba(85,62,96,0.18)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95"
              >
                Изпрати запитване
              </Link>
              <Link
                href="/pro/register"
                className="inline-flex items-center justify-center rounded-full bg-white/88 px-5 py-3 text-sm font-semibold text-on-surface shadow-[0_14px_30px_rgba(77,66,96,0.06)] transition-colors hover:bg-white"
              >
                Кандидатствай като професионалист
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[1.8rem] bg-white/70 px-5 py-5 shadow-[0_16px_36px_rgba(77,66,96,0.05)] backdrop-blur-sm xl:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                Навигация
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] bg-white/70 px-5 py-5 shadow-[0_16px_36px_rgba(77,66,96,0.05)] backdrop-blur-sm xl:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                Достъп
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {profile === undefined ? (
                  <div aria-hidden="true" className="space-y-3 pt-1">
                    <div className="h-4 w-28 rounded-full bg-white/65" />
                    <div className="h-4 w-32 rounded-full bg-white/55" />
                    <div className="h-4 w-24 rounded-full bg-white/45" />
                  </div>
                ) : profile ? (
                  <>
                    <Link
                      href={dashboardHref}
                      className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Здравей, {profile.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="text-left text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Изход
                    </button>
                    <Link
                      href="/pro/register"
                      className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      За професионалисти
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Вход
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Регистрация
                    </Link>
                    <Link
                      href="/pro/register"
                      className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                    >
                      За професионалисти
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] bg-white/70 px-5 py-5 shadow-[0_16px_36px_rgba(77,66,96,0.05)] backdrop-blur-sm sm:col-span-2 xl:col-span-1">
              <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                Процес
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {processLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/60 pt-6 text-sm text-on-surface-variant md:flex-row md:items-center md:justify-between">
          <span>© 2026 Atelier. Всички права запазени.</span>
          <span>Подреден процес за заявки, оферти и спокойно решение.</span>
        </div>
      </div>
    </footer>
  );
}
