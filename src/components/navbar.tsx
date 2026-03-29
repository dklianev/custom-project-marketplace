"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Как работи", href: "/#how-it-works" },
  { label: "Подай заявка", href: "/request/create" },
  { label: "За професионалисти", href: "/pro/register" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="fixed left-1/2 top-5 z-50 flex w-[calc(100%-1.5rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full border border-white/65 px-4 py-3 shadow-[0_28px_90px_rgba(82,94,127,0.12)] glass-nav md:top-8 md:w-[92%] md:px-6">
      <Link href="/" className="text-xl font-extrabold tracking-[-0.06em] text-on-surface md:text-2xl">
        Atelier
      </Link>

      <ul className="hidden items-center gap-2 lg:flex">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "inline-flex rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
                isActive(link.href)
                  ? "bg-white text-on-surface shadow-[0_14px_30px_rgba(77,66,96,0.08)]"
                  : "text-on-surface-variant hover:bg-white/70 hover:text-on-surface",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden items-center gap-3 lg:flex">
        <Link
          href="/login"
          className="inline-flex rounded-full px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-white/70 hover:text-on-surface"
        >
          Вход
        </Link>
        <Link
          href="/request/create"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-on-primary shadow-[0_18px_38px_rgba(85,62,96,0.2)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95"
        >
          Подай заявка
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            arrow_forward
          </span>
        </Link>
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-on-surface transition-colors hover:bg-white lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Затвори менюто" : "Отвори менюто"}
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          {mobileOpen ? "close" : "menu"}
        </span>
      </button>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full mt-3 rounded-[2rem] border border-white/70 bg-surface-container-lowest/94 p-5 shadow-[0_30px_90px_rgba(82,94,127,0.14)] backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-2">
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface"
            >
              Вход
            </Link>
            <Link
              href="/request/create"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary"
            >
              Подай заявка
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
