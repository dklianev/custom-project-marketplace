"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { RequestLeadCard } from "@/components/request-lead-card";
import { useProLeadsRealtime } from "@/hooks/use-pro-leads-realtime";
import { useProfessionalWorkspace } from "@/hooks/use-professional-workspace";

type TabKey = "all" | "urgent" | "planned";

function formatRelativeDate(value: string) {
  const target = new Date(value).getTime();
  const diffMs = Date.now() - target;

  if (!Number.isFinite(target) || diffMs < 0) {
    return "току-що";
  }

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) {
    return "току-що";
  }
  if (minutes < 60) {
    return `преди ${minutes} мин.`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `преди ${hours} ч.`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `преди ${days} дни`;
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

function getProjectStatusCopy(status: string) {
  switch (status) {
    case "REVIEW":
      return "Преглед";
    case "APPROVAL":
      return "Чака одобрение";
    case "FINALIZATION":
      return "Финализиране";
    case "COMPLETED":
      return "Завършен";
    case "CANCELLED":
      return "Прекратен";
    case "DESIGN":
      return "В работа";
    default:
      return "Активен";
  }
}

export default function ProDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const { leads, loading: leadsLoading, error: leadsError, isRealtimeActive, counts } = useProLeadsRealtime();
  const { projects, offers, loading: workspaceLoading, error: workspaceError } = useProfessionalWorkspace();

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

  const pendingOffers = useMemo(() => offers.filter((offer) => offer.status === "PENDING"), [offers]);
  const liveProjects = useMemo(() => projects.filter((project) => !["COMPLETED", "CANCELLED"].includes(project.status)), [projects]);
  const actionProjects = useMemo(
    () => liveProjects.filter((project) => ["REVIEW", "APPROVAL", "FINALIZATION"].includes(project.status) || project.progress < 80),
    [liveProjects],
  );

  const priorities = useMemo(() => {
    const items: string[] = [];

    if (counts.urgent > 0) {
      items.push(`Имаш ${counts.urgent} спешни заявки, които искат бърз отговор и ясен първи тон.`);
    }
    if (pendingOffers.length > 0) {
      items.push(`Изчакват ${pendingOffers.length} вече изпратени оферти — дръж цената и обхвата последователни, за да не губиш доверие.`);
    }
    if (actionProjects.length > 0) {
      items.push(`Активни са ${actionProjects.length} проекта, които искат коментар, одобрение или финално предаване.`);
    }

    if (items.length === 0) {
      items.push("В момента нямаш спешни действия. Дръж наличността си актуална и подготви спокойни, ясни оферти за следващите подходящи заявки.");
    }

    return items.slice(0, 3);
  }, [actionProjects.length, counts.urgent, pendingOffers.length]);

  const offerRows = useMemo(() => {
    return pendingOffers.map((offer) => ({
      id: offer.id,
      title: offer.request.title,
      subtitle: `${formatCurrency(offer.price)} · ${offer.timeline} дни · ${formatRelativeDate(offer.createdAt)}`,
      description: "Офертата е изпратена и чака клиентско решение. Дръж комуникацията в контекста на заявката, без да прехвърляш следващите стъпки извън платформата.",
      href: "/pro/requests",
    }));
  }, [pendingOffers]);

  const projectRows = useMemo(() => {
    return actionProjects.map((project) => ({
      id: project.id,
      title: project.title,
      subtitle: `${getProjectStatusCopy(project.status)} · ${project.progress}% · ${project.client.name}`,
        description:
        project.status === "APPROVAL"
          ? "Клиентът чака ясно предаване и причина защо точно този етап е готов за одобрение."
          : project.status === "REVIEW"
            ? "Събери обратната връзка на едно място и подготви следващата итерация без излишен оперативен шум."
            : project.payment && project.payment.status !== "COMPLETED"
              ? "Плащането още не е завършено. Дръж проекта спокоен и прозрачен, докато клиентът мине през плащането."
              : `Последна активност ${formatRelativeDate(project.updatedAt)}. Подготви следващата стъпка така, че клиентът да вижда прогрес и увереност.`,
      href: `/pro/project/${project.id}`,
    }));
  }, [actionProjects]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Табло за професионалиста</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
                Виж качеството на възможностите, не само броя им.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Това не е оперативно табло. Това е подредена входяща зона за заявки, оферти и активни проекти, подредена около доверие, време за реакция и смислен следващ ход.
              </p>

              <div className="mt-6 inline-flex gap-1 rounded-full bg-surface-container-low p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                      activeTab === tab.key
                        ? "bg-primary text-on-primary shadow-[0_12px_24px_rgba(83,78,124,0.18)]"
                        : "text-on-surface-variant hover:bg-white hover:text-on-surface"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1.5 opacity-80">({tab.count})</span>
                  </button>
                ))}
              </div>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Пулс</SectionEyebrow>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Подходящи заявки</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{counts.all}</p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {counts.urgent} са спешни, {counts.planned} са по-планирани и позволяват по-спокойна подготовка на офертата.
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Сигнали в реално време</p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {isRealtimeActive ? "Нови подходящи заявки влизат веднага в таблото ти." : "Обновяването в реално време не е активно в тази сесия, но последното състояние остава подредено."}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Оферти в очакване</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{workspaceLoading ? "..." : pendingOffers.length}</p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {workspaceError ?? "Това са офертите, които вече чакат клиентско решение."}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Активни проекти</p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">{workspaceLoading ? "..." : liveProjects.length}</p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    Проектите, които искат ритъм, ясно предаване и спокойна комуникация.
                  </p>
                </div>
              </div>
            </EditorialPanel>
          </div>

          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <SectionEyebrow className="mb-3">Нови съвпадения</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Заявки, които заслужават внимание</h2>
              </div>
              <Link
                href="/pro/requests"
                className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
              >
                Виж всички подходящи заявки
              </Link>
            </div>

            <div className="space-y-4">
              {leadsError && <EditorialPanel className="p-5 text-sm text-error">{leadsError}</EditorialPanel>}

              {leadsLoading && leads.length === 0 ? (
                <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                  Зареждаме подходящите заявки...
                </EditorialPanel>
              ) : null}

              {!leadsLoading && visibleLeads.length === 0 ? (
                <EditorialPanel className="p-8 text-center">
                  <p className="text-base font-semibold text-on-surface">Няма заявки за този филтър.</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Когато AI routing намери ново съвпадение за профила ти, то ще се появи тук.
                  </p>
                </EditorialPanel>
              ) : null}

              {visibleLeads.map((lead) => (
                <RequestLeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Приоритети за днес</SectionEyebrow>
              <div className="space-y-4">
                {priorities.map((item, index) => (
                  <div key={item} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-on-surface-variant">{item}</p>
                  </div>
                ))}
              </div>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Оферти в очакване</SectionEyebrow>
              {workspaceLoading ? (
                <p className="text-sm leading-7 text-on-surface-variant">Подреждаме изпратените оферти...</p>
              ) : offerRows.length === 0 ? (
                <p className="text-sm leading-7 text-on-surface-variant">В момента няма оферти, които чакат решение. Новите ще се появят тук.</p>
              ) : (
                <div className="space-y-3">
                  {offerRows.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                      <p className="font-semibold text-on-surface">{item.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">{item.subtitle}</p>
                      <p className="mt-3">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/pro/requests"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
              >
                Към заявките
              </Link>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Проекти с действие</SectionEyebrow>
              {workspaceLoading ? (
                <p className="text-sm leading-7 text-on-surface-variant">Подреждаме активните проекти...</p>
              ) : projectRows.length === 0 ? (
                <p className="text-sm leading-7 text-on-surface-variant">Няма проекти, които да искат действие точно сега. Когато има, ще стоят тук.</p>
              ) : (
                <div className="space-y-3">
                  {projectRows.slice(0, 3).map((item) => (
                    <Link key={item.id} href={item.href} className="block rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant transition-colors hover:bg-white">
                      <p className="font-semibold text-on-surface">{item.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">{item.subtitle}</p>
                      <p className="mt-3">{item.description}</p>
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href={projectRows[0]?.href ?? "/pro/dashboard"}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
              >
                Отвори следващия проект
              </Link>
            </EditorialPanel>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
