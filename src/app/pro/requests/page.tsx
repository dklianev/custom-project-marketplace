"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { RequestLeadCard } from "@/components/request-lead-card";
import { useProLeadsRealtime } from "@/hooks/use-pro-leads-realtime";

type TabKey = "all" | "urgent" | "planned";

export default function ProRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const { leads, loading, error, isRealtimeActive, counts } =
    useProLeadsRealtime();

  const tabs = [
    { key: "all" as const, label: "Всички", count: counts.all },
    { key: "urgent" as const, label: "Спешни", count: counts.urgent },
    { key: "planned" as const, label: "Планирани", count: counts.planned },
  ];

  const visibleLeads = useMemo(() => {
    if (activeTab === "urgent") {
      return leads.filter((lead) => lead.urgency === "URGENT");
    }

    if (activeTab === "planned") {
      return leads.filter((lead) => lead.urgency === "PLANNED");
    }

    return leads;
  }, [activeTab, leads]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-12 pt-36">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-on-surface-variant">
                Професионални заявки
              </p>
              <h1 className="mt-1 text-3xl font-bold text-on-surface">
                Matching поток
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                Това е пълният списък с live заявки, които в момента са отворени
                за професионалисти.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm text-on-surface-variant">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isRealtimeActive ? "bg-green-500" : "bg-outline"
                }`}
              />
              {isRealtimeActive ? "Свързан в реално време" : "Очаква връзка"}
            </div>
          </div>

          <div className="mb-8 inline-flex gap-1 rounded-full bg-surface-container-low p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  activeTab === tab.key
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] bg-primary-container p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-primary-container/70">
                Налични сега
              </p>
              <p className="mt-2 text-3xl font-bold text-on-primary-container">
                {counts.all}
              </p>
              <p className="mt-2 text-sm text-on-primary-container/80">
                заявки, които чакат реакция
              </p>
            </div>

            <div className="rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
                Спешни
              </p>
              <p className="mt-2 text-3xl font-bold text-on-surface">
                {counts.urgent}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                с кратък хоризонт за реакция
              </p>
            </div>

            <div className="rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
                Планирани
              </p>
              <p className="mt-2 text-3xl font-bold text-on-surface">
                {counts.planned}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                с повече време за подготовка
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            {loading && leads.length === 0 && (
              <div className="rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest px-6 py-10 text-center text-sm text-on-surface-variant">
                Зареждаме заявките...
              </div>
            )}

            {!loading && visibleLeads.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-12 text-center">
                <p className="text-base font-semibold text-on-surface">
                  Няма заявки по избрания филтър
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Live потокът ще обнови този екран автоматично, щом се появят
                  нови заявки.
                </p>
              </div>
            )}

            {visibleLeads.map((lead) => (
              <RequestLeadCard
                key={lead.id}
                lead={lead}
                secondaryLabel="Преглед"
                primaryLabel="Създай оферта"
              />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-outline-variant/30 bg-surface-container-lowest px-6 py-5">
            <div>
              <p className="text-base font-semibold text-on-surface">
                Искаш ли по-силен conversion към оферти?
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Довърши профила си и качи по-силно портфолио, за да изглеждаш
                по-надеждно в matching потока.
              </p>
            </div>
            <Link
              href="/pro/register"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              Подобри профила
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
