"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { useProLeadsRealtime } from "@/hooks/use-pro-leads-realtime";
import { useProfessionalWorkspace } from "@/hooks/use-professional-workspace";
import { useAuthStore } from "@/stores/auth-store";

type TabKey = "all" | "urgent" | "planned";

function formatRelativeDate(value: string) {
  const target = new Date(value).getTime();
  const diffMs = Date.now() - target;

  if (!Number.isFinite(target) || diffMs < 0) {
    return "Току-що";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) {
    return "Току-що";
  }
  if (minutes < 60) {
    return `Преди ${minutes} мин.`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Преди ${hours} ч.`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `Преди ${days} дни`;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProjectStatus(status: string) {
  switch (status) {
    case "REVIEW":
      return "Преглед";
    case "APPROVAL":
      return "Одобрение";
    case "FINALIZATION":
      return "Финализиране";
    case "COMPLETED":
      return "Завършен";
    case "CANCELLED":
      return "Спрян";
    case "DESIGN":
      return "В работа";
    default:
      return "Активен";
  }
}

function getDisplayName(email: string | null) {
  if (!email) {
    return "вашето";
  }

  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) {
    return "вашето";
  }

  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ProDashboardPage() {
  const email = useAuthStore((state) => state.email);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    isRealtimeActive,
    counts,
  } = useProLeadsRealtime();
  const {
    projects,
    offers,
    loading: workspaceLoading,
    error: workspaceError,
  } = useProfessionalWorkspace();

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

  const liveProjects = useMemo(
    () => projects.filter((project) => !["COMPLETED", "CANCELLED"].includes(project.status)),
    [projects],
  );
  const pendingOffers = useMemo(
    () => offers.filter((offer) => offer.status === "PENDING"),
    [offers],
  );
  const monthlyVolume = useMemo(
    () => pendingOffers.reduce((sum, offer) => sum + offer.price, 0),
    [pendingOffers],
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-4">
            <SectionEyebrow>Професионален workspace</SectionEyebrow>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
                  Atelier Workspace
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                  {getDisplayName(email)}, тук виждате новите съвпадения, отворените оферти и активните проекти в един подреден изглед.
                </p>
              </div>
              <Link
                href="/pro/offers/create"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
              >
                Нова оферта
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </Link>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[250px_1fr]">
            <aside className="space-y-5">
              <EditorialPanel className="p-5">
                <SectionEyebrow className="mb-4">Категории</SectionEyebrow>
                <div className="space-y-2">
                  {["Всички", "Интериорен дизайн", "Уеб дизайн", "Персонализирани изделия"].map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-sm font-semibold ${index === 0 ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}
                    >
                      {label}
                      {index === 0 ? <span>{counts.all}</span> : null}
                    </button>
                  ))}
                </div>
              </EditorialPanel>

              <div className="rounded-[2rem] bg-primary-container px-6 py-6 text-on-primary-container shadow-[0_22px_56px_rgba(85,62,96,0.16)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">Месечен обем</p>
                <p className="mt-5 text-4xl font-black tracking-[-0.06em]">{workspaceLoading ? "..." : formatCurrency(monthlyVolume || 0)}</p>
                <p className="mt-3 text-sm leading-7 opacity-80">
                  {pendingOffers.length > 0
                    ? `${pendingOffers.length} активни оферти чакат решение от клиенти.`
                    : "Няма висящи оферти — време е за следващото качествено съвпадение."}
                </p>
              </div>

              <EditorialPanel className="p-5 text-sm leading-7 text-on-surface-variant">
                <SectionEyebrow className="mb-4">Сигнал на системата</SectionEyebrow>
                {isRealtimeActive
                  ? "Realtime известията са активни и новите заявки се появяват веднага щом Atelier ги насочи към вас."
                  : "Realtime връзката не е активна в момента, но последните съвпадения остават налични за преглед."}
              </EditorialPanel>
            </aside>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.key ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"}`}
                  >
                    {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
                  </button>
                ))}
              </div>

              {leadsError || workspaceError ? (
                <EditorialPanel className="p-5 text-sm text-error">
                  {leadsError ?? workspaceError}
                </EditorialPanel>
              ) : null}

              {leadsLoading && visibleLeads.length === 0 ? (
                <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                  Зареждаме новите съвпадения...
                </EditorialPanel>
              ) : null}

              {!leadsLoading && visibleLeads.length === 0 ? (
                <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                  В момента няма нови заявки за този изглед. Atelier ще покаже следващите подходящи брифове веднага щом ги насочи към вас.
                </EditorialPanel>
              ) : null}

              {visibleLeads.length > 0 ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {visibleLeads.slice(0, 4).map((lead) => (
                    <EditorialPanel key={lead.id} className="p-5 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                            <span className={`rounded-full px-3 py-1 font-semibold ${lead.urgency === "URGENT" ? "bg-error/10 text-error" : lead.urgency === "PLANNED" ? "bg-surface-container-low text-on-surface-variant" : "bg-primary/8 text-primary"}`}>
                              {lead.urgencyLabel}
                            </span>
                            <span>{lead.timeLabel}</span>
                          </div>
                          <h2 className="mt-4 text-2xl font-extrabold tracking-tight">{lead.title}</h2>
                        </div>
                        <span className="material-symbols-outlined rounded-full bg-primary/8 p-3 text-primary">
                          {lead.icon}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-on-surface-variant">{lead.excerpt}</p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Защо сте избрани</p>
                          <p className="mt-2">{lead.matchReason}</p>
                        </div>
                        <div className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Бюджет и срок</p>
                          <p className="mt-2">{lead.budgetConfidence}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                        <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{lead.location}</span>
                        <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{lead.budget}</span>
                        <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{lead.responseWindow}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={lead.ctaLink}
                          className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                        >
                          Отвори бриф
                        </Link>
                        <Link
                          href={lead.ctaLink}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                        >
                          Чернова на оферта
                          <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                        </Link>
                      </div>
                    </EditorialPanel>
                  ))}
                </div>
              ) : null}

              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <SectionEyebrow>Активни проекти</SectionEyebrow>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">Проекти, които искат внимание</h2>
                  </div>
                  <Link
                    href="/pro/requests"
                    className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                  >
                    Всички заявки
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                </div>

                <EditorialPanel className="overflow-hidden p-0">
                  <div className="divide-y divide-outline-variant/10">
                    {workspaceLoading ? (
                      <div className="px-6 py-8 text-sm text-on-surface-variant">Зареждаме активните проекти...</div>
                    ) : liveProjects.length === 0 ? (
                      <div className="px-6 py-8 text-sm text-on-surface-variant">
                        Все още няма активни проекти. След приета оферта тук ще се появи следващият работен контекст.
                      </div>
                    ) : (
                      liveProjects.slice(0, 4).map((project) => (
                        <Link
                          key={project.id}
                          href={`/pro/project/${project.id}`}
                          className="grid gap-4 px-6 py-5 transition-colors hover:bg-white/40 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto] md:items-center"
                        >
                          <div>
                            <p className="text-base font-bold text-on-surface">{project.title}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">{project.client.name}</p>
                          </div>
                          <div className="text-sm text-on-surface-variant">
                            {project.request.location ?? "Онлайн / по уговорка"}
                          </div>
                          <div className="text-sm text-on-surface-variant">
                            {formatProjectStatus(project.status)}
                          </div>
                          <div className="text-sm text-on-surface-variant">
                            {project.payment ? formatCurrency(project.payment.total) : `${project.progress}%`}
                          </div>
                          <div className="text-sm font-semibold text-primary">
                            {formatRelativeDate(project.updatedAt)}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </EditorialPanel>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
