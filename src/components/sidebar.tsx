"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Star,
  Settings,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FileText },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Reviews", href: "/dashboard/reviews", icon: Star },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link
          href="/"
          className="text-xl font-bold text-[#1d1b1d]"
          onClick={onNavigate}
        >
          Atelier
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.05em] text-[#1d1b1d]/50">
          Curator Panel
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-[2rem] px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#6e5678]/10 text-[#6e5678]"
                      : "text-[#1d1b1d]/60 hover:bg-[#1d1b1d]/5 hover:text-[#1d1b1d]"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom user section */}
      <div className="px-4 pb-6">
        <div className="h-px bg-[#1d1b1d]/10" />
        <div className="mt-4 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6e5678] to-[#c3a6cd]">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1d1b1d]">
              Curator
            </p>
            <p className="truncate text-xs text-[#1d1b1d]/50">
              Professional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex items-center justify-center rounded-xl bg-[#f9f2f5]/80 p-2.5 text-[#1d1b1d] shadow-[0_24px_48px_-12px_rgba(46,58,89,0.08)] backdrop-blur-[40px] md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64",
          "flex-col",
          "bg-[#f9f2f5]/80 backdrop-blur-[40px]",
          "rounded-r-[3rem]",
          "shadow-[0_24px_48px_-12px_rgba(46,58,89,0.08)]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile slide-out */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-64",
              "bg-[#f9f2f5]/80 backdrop-blur-[40px]",
              "rounded-r-[3rem]",
              "shadow-[0_24px_48px_-12px_rgba(46,58,89,0.08)]",
              "animate-[slideInLeft_200ms_ease-out]"
            )}
          >
            {/* Close button */}
            <div className="absolute right-3 top-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
                className="rounded-lg p-2 text-[#1d1b1d] transition-colors hover:bg-[#1d1b1d]/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
