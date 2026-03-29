"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { useCustomerWorkspace } from "@/hooks/use-customer-workspace";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatPaymentStatus(status: string) {
  switch (status) {
    case "PROCESSING":
      return "в обработка";
    case "COMPLETED":
      return "завършено";
    case "FAILED":
      return "неуспешно";
    case "REFUNDED":
      return "възстановено";
    default:
      return "подготвено";
  }
}

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

function getProjectStatusLabel(status: string) {
  switch (status) {
    case "CREATED":
      return "Нов проект";
    case "REVIEW":
      return "В преглед";
    case "DESIGN":
      return "В работа";
    case "APPROVAL":
      return "Чака одобрение";
    case "FINALIZATION":
      return "Финализиране";
    case "COMPLETED":
      return "Завършен";
    case "CANCELLED":
      return "Прекратен";
    default:
      return status;
  }
}

type AttentionItem = {
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  trust: string;
};

type ProjectRow = {
  status: string;
  title: string;
  professional: string;
  update: string;
  nextAction: string;
  trust: string;
  href: string;
};

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <EditorialPanel className="p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/70">{item.label}</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{item.title}</h2>
      <p className="mt-4 text-sm leading-7 text-on-surface-variant">{item.description}</p>
      <div className="mt-5 rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
        {item.trust}
      </div>
      <Link
        href={item.href}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
      >
        {item.cta}
        <span aria-hidden="true" className="material-symbols-outlined text-lg">
          arrow_forward
        </span>
      </Link>
    </EditorialPanel>
  );
}

function ProjectRowCard({ item }: { item: ProjectRow }) {
  return (
    <EditorialPanel className="p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              {item.status}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">
              {item.professional}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-on-surface">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item.update}</p>
          </div>
        </div>

        <div className="max-w-sm rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant lg:min-w-[280px]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
            Следващ ход
          </p>
          <p className="mt-2 text-on-surface">{item.nextAction}</p>
          <p className="mt-3">{item.trust}</p>
          <Link
            href={item.href}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)] transition-colors hover:bg-surface-container-lowest"
          >
            Отвори
          </Link>
        </div>
      </div>
    </EditorialPanel>
  );
}

export default function DashboardPage() {
  const {
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    isRealtimeActive,
    notifications,
  } = useRealtimeNotifications();
  const { projects, offers, loading, error } = useCustomerWorkspace();

  const pendingOffers = useMemo(() => offers.filter((offer) => offer.status === "PENDING"), [offers]);
  const activeProjects = useMemo(
    () => projects.filter((project) => !["COMPLETED", "CANCELLED"].includes(project.status)),
    [projects],
  );
  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "COMPLETED"),
    [projects],
  );
  const reviewDueProjects = useMemo(
    () => completedProjects.filter((project) => !project.review),
    [completedProjects],
  );

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    if (pendingOffers.length > 0) {
      const primaryOffer = [...pendingOffers].sort((left, right) => {
        if (left.featured === right.featured) {
          return left.price - right.price;
        }
        return left.featured ? -1 : 1;
      })[0];

      const compareParams = new URLSearchParams({
        requestId: primaryOffer.request.id,
        query: primaryOffer.request.title,
      });
      if (primaryOffer.request.location) {
        compareParams.set("city", primaryOffer.request.location);
      }
      if (primaryOffer.request.budget) {
        compareParams.set("budget", primaryOffer.request.budget);
      }
      if (primaryOffer.request.timeline) {
        compareParams.set("timeline", primaryOffer.request.timeline);
      }

      items.push({
        label: "Решение чака теб",
        title:
          pendingOffers.length === 1
            ? "Имаш 1 активна оферта за избор"
            : `Имаш ${pendingOffers.length} активни оферти за избор`,
        description: `Най-силният текущ сигнал идва за „${primaryOffer.request.title}“. Прегледай офертите подред и избери спокойно, вместо да ровиш из отделни профили.`,
        href: `/offers/compare?${compareParams.toString()}`,
        cta: "Сравни офертите",
        trust: `Най-добрият текущ бюджетен сигнал е ${formatCurrency(primaryOffer.price)} от ${primaryOffer.professional.name}. Всички следващи стъпки остават в защитения поток на Atelier.`,
      });
    }

    if (unreadCount > 0) {
      items.push({
        label: "Нови съобщения",
        title: unreadCount === 1 ? "Имаш 1 непрочетено съобщение" : `Имаш ${unreadCount} непрочетени съобщения`,
        description: notifications[0]?.title
          ? `Последният активен сигнал е: ${notifications[0].title}.`
          : "Чатът и статусите остават към конкретните проекти, без да се разпиляват в отделна входяща кутия.",
        href: activeProjects[0] ? `/project/${activeProjects[0].id}` : "/dashboard",
        cta: "Отвори разговора",
        trust: "Съобщенията идват само от участниците по проекта и стоят в контекста на заявката, офертата и текущия етап.",
      });
    }

    if (reviewDueProjects.length > 0) {
      const project = reviewDueProjects[0];
      items.push({
        label: "Последна стъпка",
        title: `Затвори „${project.title}“ с ревю`,
        description: `Проектът с ${project.professional.name} е приключил. Остава да дадеш честна обратна връзка, за да затвориш цикъла на доверие.`,
        href: `/review/${project.id}`,
        cta: "Остави ревю",
        trust: "Ревюто се връзва към реалния проект и подпомага следващите клиенти, вместо да бъде анонимен рейтинг без контекст.",
      });
    }

    if (items.length === 0 && activeProjects[0]) {
      const project = activeProjects[0];
      items.push({
        label: "Активен проект",
        title: `Продължи с „${project.title}“`,
        description: `Нямаш висящи решения в момента, но проектът с ${project.professional.name} продължава и следващата стъпка е ясно подредена.`,
        href: `/project/${project.id}`,
        cta: "Отвори проекта",
        trust: "Всички етапи, чатът и плащането остават събрани на едно място.",
      });
    }

    return items.slice(0, 3);
  }, [activeProjects, notifications, pendingOffers, reviewDueProjects, unreadCount]);

  const activeRows = useMemo<ProjectRow[]>(() => {
    return activeProjects.map((project) => {
      const nextMilestone = project.milestones.find((item) => !item.completed);
      const nextAction =
        project.status === "APPROVAL"
          ? "Прегледай последната доставка и потвърди следващия етап."
          : project.payment && project.payment.status !== "COMPLETED"
            ? "Довърши защитеното плащане, за да остане проектът в движение."
            : nextMilestone
              ? `Следва ${nextMilestone.title.toLowerCase()}${project.deadline ? " преди крайния срок." : "."}`
              : "Продължи разговора и следи следващия етап от проекта.";

      const trust = project.payment
        ? `Плащане: ${formatPaymentStatus(project.payment.status)} · прогрес ${project.progress}%.`
        : `Проверен професионалист · ${project.professional.reviewCount} ревюта · обновено ${formatRelativeDate(project.updatedAt)}.`;

      return {
        status: getProjectStatusLabel(project.status),
        title: project.title,
        professional: project.professional.name,
        update: `Последна активност ${formatRelativeDate(project.updatedAt)}. ${nextMilestone ? `Следващият етап е „${nextMilestone.title}“.` : "Професионалистът вече е предал текущата част от работата."}`,
        nextAction,
        trust,
        href: project.payment && project.payment.status !== "COMPLETED" ? `/payment?offer=${project.offer?.id ?? ""}` : `/project/${project.id}`,
      };
    });
  }, [activeProjects]);

  const completedRows = useMemo<ProjectRow[]>(() => {
    return completedProjects.map((project) => ({
      status: project.review ? "Архив и доверие" : "Чака ревю",
      title: project.title,
      professional: project.professional.name,
      update: `Проектът е завършен и последно е обновен ${formatRelativeDate(project.updatedAt)}.`,
      nextAction: project.review
        ? "Прегледай финалните материали и пази проекта в архива си."
        : "Остави ревю, за да затвориш проекта и да подсилиш профила на професионалиста.",
      trust: project.review
        ? "Ревюто вече е публикувано и проектът е преминал през целия защитен цикъл."
        : "Няма оставено ревю. Това е последният липсващ сигнал на доверие в завършения процес.",
      href: project.review ? `/project/${project.id}` : `/review/${project.id}`,
    }));
  }, [completedProjects]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Клиентско табло</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
                Всичко важно е подредено около решенията ти.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Без SaaS шум и без отделни административни панели. Тук виждаш само
                това, което движи заявката напред: оферти за избор, активни проекти,
                чат и ревюта.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/request/create"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                >
                  Нова заявка
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    add
                  </span>
                </Link>
                {pendingOffers[0] ? (
                  <Link
                    href={`/offers/compare?requestId=${pendingOffers[0].request.id}&query=${encodeURIComponent(pendingOffers[0].request.title)}`}
                    className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                  >
                    Оферти за избор
                  </Link>
                ) : null}
              </div>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Пулс на доверието</SectionEyebrow>
              <div className="space-y-4">
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Сигнали в реално време
                  </p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {isRealtimeActive
                      ? "Обновяването в реално време е активно и държи чатовете и известията в контекста на проекта."
                      : "Обновяването в реално време не е активно в тази сесия, но последното състояние остава видимо и подредено."}
                  </p>
                </div>
                <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Какво чака теб
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-on-surface">
                    {loading || notificationsLoading ? "..." : pendingOffers.length + reviewDueProjects.length + unreadCount}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    {error ??
                      notificationsError ??
                      `${formatCount(pendingOffers.length, "оферта", "оферти")}, ${formatCount(reviewDueProjects.length, "ревю", "ревюта")} и ${formatCount(unreadCount, "чат сигнал", "чат сигнала")} чакат действие.`}
                  </p>
                </div>
              </div>
            </EditorialPanel>
          </div>

          <section>
            <div className="mb-5">
              <SectionEyebrow className="mb-3">Нужно внимание</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Решенията, които движат заявките напред</h2>
            </div>
            {attentionItems.length === 0 ? (
              <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                Нямаш отворени решения в момента. Следващите оферти и проекти ще се появят тук.
              </EditorialPanel>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {attentionItems.map((item) => (
                  <AttentionCard key={item.title} item={item} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <SectionEyebrow className="mb-3">Активни проекти</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Какво се случва по живите ангажименти</h2>
            </div>
            {loading ? (
              <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                Подреждаме активните проекти...
              </EditorialPanel>
            ) : activeRows.length === 0 ? (
              <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                Все още няма активни проекти. След като приемеш оферта, тук ще виждаш етапите, чата и следващия ход.
              </EditorialPanel>
            ) : (
              <div className="space-y-4">
                {activeRows.map((item) => (
                  <ProjectRowCard key={item.href} item={item} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <SectionEyebrow className="mb-3">Архив и доверие</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Завършени проекти и следващият им смислен ход</h2>
            </div>
            {loading ? (
              <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                Подреждаме завършените проекти...
              </EditorialPanel>
            ) : completedRows.length === 0 ? (
              <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
                Още няма завършени проекти. Когато има, тук ще стоят ревютата и финалните архиви.
              </EditorialPanel>
            ) : (
              <div className="space-y-4">
                {completedRows.map((item) => (
                  <ProjectRowCard key={item.href} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
