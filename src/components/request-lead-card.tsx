"use client";

import Link from "next/link";
import { EditorialPanel } from "@/components/editorial-primitives";
import type { ProLead } from "@/lib/pro-leads";

function UrgencyBadge({
  urgency,
  label,
}: {
  urgency: ProLead["urgency"];
  label: string;
}) {
  if (urgency === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error/12 px-3 py-1 text-xs font-semibold text-error">
        <span aria-hidden="true" className="material-symbols-outlined text-sm">
          bolt
        </span>
        {label}
      </span>
    );
  }

  if (urgency === "PLANNED") {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
      {label}
    </span>
  );
}

export function RequestLeadCard({
  lead,
  secondaryLabel = "Отвори брифа",
  primaryLabel = "Чернова на оферта",
  showExcerpt = true,
}: {
  lead: ProLead;
  secondaryLabel?: string;
  primaryLabel?: string;
  showExcerpt?: boolean;
}) {
  return (
    <EditorialPanel className="p-6 md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {lead.icon}
            </span>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyBadge urgency={lead.urgency} label={lead.urgencyLabel} />
              <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                {lead.category}
              </span>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {lead.timeLabel}
              </span>
            </div>

            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-on-surface">{lead.title}</h3>
              {showExcerpt && (
                <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
                  {lead.excerpt}
                </p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Защо съвпада
                </p>
                <p className="mt-2">{lead.matchReason}</p>
              </div>
              <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Бюджетен сигнал
                </p>
                <p className="mt-2">{lead.budgetConfidence}</p>
              </div>
              <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Очакван отговор
                </p>
                <p className="mt-2">{lead.responseWindow}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">location_on</span>
                {lead.location}
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">payments</span>
                {lead.budget}
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">forum</span>
                {lead.offerCount} оферти в процес
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-[220px]">
          <Link
            href={lead.ctaLink}
            className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
          >
            {secondaryLabel}
          </Link>
          <Link
            href={lead.ctaLink}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
          >
            {primaryLabel}
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </EditorialPanel>
  );
}
