"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

type FooterProfile = {
  name: string;
  role: "CLIENT" | "PROFESSIONAL";
};

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
          user?: { name?: string | null; role?: "CLIENT" | "PROFESSIONAL" };
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
    <footer className="mt-24 border-t border-white/55 bg-surface-container-low px-6 py-14 md:px-10 md:py-18">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        <div className="max-w-md">
          <span className="block text-3xl font-black tracking-[-0.06em] text-on-surface">
            Atelier
          </span>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">
            AI-маркетплейс за заявки, оферти и проверени професионалисти. Atelier
            подрежда проекта, намалява шума и помага да стигнеш до спокойно решение.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
              Навигация
            </h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/#how-it-works"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Как работи
              </Link>
              <Link
                href="/request/create"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Нова заявка
              </Link>
              <Link
                href="/offers/compare"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Сравнение на оферти
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
              Достъп
            </h2>
            <div className="flex flex-col gap-3">
              {profile === undefined ? (
                <div
                  aria-hidden="true"
                  className="space-y-3"
                >
                  <div className="h-4 w-24 rounded-full bg-white/65" />
                  <div className="h-4 w-28 rounded-full bg-white/55" />
                  <div className="h-4 w-20 rounded-full bg-white/45" />
                </div>
              ) : profile ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    Моето табло
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="text-left text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    Изход
                  </button>
                  <Link
                    href="/pro/register"
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    За професионалисти
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    Вход
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    Регистрация
                  </Link>
                  <Link
                    href="/pro/register"
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    За професионалисти
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/70">
              Процес
            </h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/requests"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Моите заявки
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Табло на клиента
              </Link>
              <Link
                href="/pro/dashboard"
                className="text-sm text-on-surface-variant transition-colors hover:text-primary"
              >
                Табло на изпълнителя
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-white/60 pt-6 text-sm text-on-surface-variant">
        © 2026 Atelier. Всички права запазени.
      </div>
    </footer>
  );
}
