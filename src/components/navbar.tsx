"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Как работи", href: "/#how-it-works" },
  { label: "Нова заявка", href: "/request/create" },
  { label: "За професионалисти", href: "/pro/register" },
];

type NavProfile = {
  name: string;
  role: "CLIENT" | "PROFESSIONAL";
};

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavProfile | null>(null);
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

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const dashboardHref =
    profile?.role === "PROFESSIONAL" ? "/pro/dashboard" : "/dashboard";

  const avatarLabel = useMemo(() => {
    if (!profile?.name) {
      return "A";
    }

    return profile.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);
  }, [profile?.name]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearSession();
      setProfile(null);
      setMobileOpen(false);
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="fixed left-1/2 top-6 z-50 flex w-[calc(100%-1.5rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full border border-white/65 bg-white/72 px-4 py-3 shadow-[0_22px_70px_rgba(82,94,127,0.08)] backdrop-blur-xl md:w-[92%] md:px-6">
      <div className="flex items-center gap-10">
        <Link
          href="/"
          className="text-lg font-black tracking-[-0.06em] text-on-surface md:text-2xl"
        >
          Atelier
        </Link>

        <ul className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "border-b-2 pb-1 text-sm font-semibold transition-colors",
                  isActive(link.href)
                    ? "border-primary-fixed-dim text-primary"
                    : "border-transparent text-on-surface-variant hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden items-center gap-4 lg:flex">
        {profile ? (
          <>
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-3 rounded-full bg-white/86 px-3 py-2 text-sm font-semibold text-on-surface shadow-[0_12px_28px_rgba(82,94,127,0.08)] transition-colors hover:bg-white"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-xs font-black text-primary">
                {avatarLabel}
              </span>
              <span className="max-w-[10rem] truncate">{profile.name}</span>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              Изход
            </button>
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
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(120deg,#553e60_0%,#6e5678_100%)] px-5 py-2.5 text-sm font-black text-on-primary shadow-[0_14px_34px_rgba(85,62,96,0.18)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95"
            >
              Регистрация
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-on-surface transition-colors hover:bg-white lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Затвори менюто" : "Отвори менюто"}
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          {mobileOpen ? "close" : "menu"}
        </span>
      </button>

      {mobileOpen ? (
        <div className="absolute left-0 right-0 top-full mt-3 rounded-[2rem] border border-white/70 bg-surface-container-lowest/96 p-5 shadow-[0_26px_70px_rgba(82,94,127,0.12)] backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-[1.4rem] px-4 py-3 text-sm font-semibold transition-colors",
                  isActive(link.href)
                    ? "bg-surface-container-low text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {profile ? (
            <div className="mt-4 space-y-3">
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary"
              >
                Моето табло
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex w-full items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface"
              >
                Изход
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface"
              >
                Вход
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
