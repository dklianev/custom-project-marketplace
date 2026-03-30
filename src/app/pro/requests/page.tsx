"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { useProLeadsRealtime } from "@/hooks/use-pro-leads-realtime";

type TabKey = "all" | "urgent" | "planned";

function buildAccent(index: number) {
  const accents = [
    "bg-white/88",
    "bg-surface-container-low text-on-surface",
    "bg-white/84",
    "bg-white/82",
  ] as const;

  return accents[index % accents.length];
}

export default function ProRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const { leads, loading, error, isRealtimeActive, counts } = useProLeadsRealtime();

  const tabs = [
    { key: "all" as const, label: "Нови", count: counts.all },
    { key: "urgent" as const, label: "Спешни", count: counts.urgent },
    { key: "planned" as const, label: "Днес", count: counts.planned },
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
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-4">
            <SectionEyebrow>Професионално табло</SectionEyebrow>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[2.5rem] font-extrabold leading-[1.03] tracking-[-0.06em] md:text-[4rem]">
                  Вашите нови заявки
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
                  Прегледайте релевантните брифове, подредете бюджета и срока и влезте в офертата само когато съвпадението е правилно.
                </p>
              </div>
              <div className="rounded-full bg-white/78 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant shadow-[0_12px_28px_rgba(77,66,96,0.05)]">
                {isRealtimeActive ? "На живо" : "Опашка"}
              </div>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex gap-1 rounded-full bg-white/82 p-1 shadow-[0_12px_28px_rgba(77,66,96,0.05)] backdrop-blur-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                    activeTab === tab.key
                      ? "bg-primary text-on-primary shadow-[0_14px_30px_rgba(85,62,96,0.18)]"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              {["Категория", "Град", "Бюджет"].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full bg-white/78 px-4 py-2 shadow-[0_10px_24px_rgba(77,66,96,0.04)] transition-colors hover:bg-white"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <EditorialPanel className="p-5 text-sm text-error">{error}</EditorialPanel>
          ) : null}

          {loading && visibleLeads.length === 0 ? (
            <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
              Зареждаме новите брифове...
            </EditorialPanel>
          ) : !loading && visibleLeads.length === 0 ? (
            <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
              В момента няма нови заявки за този изглед. Atelier ще подреди следващите релевантни възможности веднага щом се появят.
            </EditorialPanel>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {visibleLeads.map((lead, index) => (
                <article
                  key={lead.id}
                  className={`rounded-[2rem] px-5 py-5 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl ${buildAccent(index)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${lead.urgency === "URGENT" ? "bg-error/10 text-error" : "bg-primary/8 text-primary"}`}>
                        {lead.urgencyLabel}
                      </span>
                      <span>{lead.timeLabel}</span>
                    </div>
                    <span className="text-xs text-on-surface-variant/60">{lead.category}</span>
                  </div>

                  <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_180px] lg:items-start">
                    <div>
                      <h2 className="text-[1.9rem] font-extrabold leading-tight tracking-[-0.05em] text-on-surface">
                        {lead.title}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                        {lead.excerpt}
                      </p>
                    </div>
                    <div className="overflow-hidden rounded-[1.7rem] bg-surface-container-low">
                      <div className={`aspect-[4/3] ${index % 2 === 1 ? "bg-[radial-gradient(circle_at_50%_25%,rgba(211,220,236,0.95),rgba(140,150,174,0.82),rgba(96,94,128,0.95))]" : "bg-[radial-gradient(circle_at_50%_25%,rgba(235,236,241,0.95),rgba(180,175,193,0.82),rgba(109,99,134,0.92))]"}`} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Локация</p>
                      <p className="mt-2 font-semibold text-on-surface">{lead.location}</p>
                    </div>
                    <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Бюджет</p>
                      <p className="mt-2 font-semibold text-on-surface">{lead.budget}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                    {lead.matchReason}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-full bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                      {lead.responseWindow}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={lead.ctaLink}
                        className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                      >
                        Преглед
                      </Link>
                      <Link
                        href={lead.ctaLink}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.18)] transition-opacity hover:opacity-95"
                      >
                        Изпрати оферта
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">
                          arrow_forward
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
