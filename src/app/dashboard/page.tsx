"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { useCustomerWorkspace } from "@/hooks/use-customer-workspace";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useAuthStore } from "@/stores/auth-store";

const DASHBOARD_ARTWORKS = [
  "/editorial/request-active.svg",
  "/editorial/project-concept.svg",
  "/editorial/portfolio-02.svg",
  "/editorial/portfolio-01.svg",
] as const;

function pickDashboardArtwork(index: number) {
  return DASHBOARD_ARTWORKS[index % DASHBOARD_ARTWORKS.length];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

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

function formatProjectStatus(status: string) {
  switch (status) {
    case "CREATED":
      return "Старт";
    case "REVIEW":
      return "Преглед";
    case "DESIGN":
      return "Изпълнение";
    case "APPROVAL":
      return "Одобрение";
    case "FINALIZATION":
      return "Финализиране";
    case "COMPLETED":
      return "Завършен";
    case "CANCELLED":
      return "Спрян";
    default:
      return status;
  }
}

function getDisplayName(email: string | null) {
  if (!email) {
    return "Добре дошъл";
  }

  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) {
    return "Добре дошъл";
  }

  return local
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const email = useAuthStore((state) => state.email);
  const { projects, offers, loading, error } = useCustomerWorkspace();
  const {
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
  } = useRealtimeNotifications();

  const pendingOffers = useMemo(
    () => offers.filter((offer) => offer.status === "PENDING"),
    [offers],
  );
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

  const averageProgress = useMemo(() => {
    if (activeProjects.length === 0) {
      return 0;
    }

    return Math.round(
      activeProjects.reduce((sum, project) => sum + project.progress, 0) /
        activeProjects.length,
    );
  }, [activeProjects]);

  const cards = useMemo(() => {
    const offerCards = pendingOffers.map((offer, index) => ({
      id: `offer-${offer.id}`,
      badge: "Нови оферти",
      title: offer.request.title,
      description: `${offer.professional.name} изпрати оферта за ${formatCurrency(offer.price)} с изпълнение до ${offer.timeline} дни.`,
      metaLeft: offer.request.location ?? "Онлайн / по уговорка",
      metaRight: offer.request.budget ?? "По зададен бюджет",
      accent: `${pendingOffers.length} активни оферти`,
      href: `/offers/compare?requestId=${offer.requestId}&query=${encodeURIComponent(offer.request.title)}`,
      cta: "Сравни офертите",
      image: pickDashboardArtwork(index),
      updatedAt: offer.createdAt,
    }));

    const projectCards = activeProjects.map((project, index) => {
      const nextMilestone = project.milestones.find((item) => !item.completed);
      return {
        id: `project-${project.id}`,
        badge: formatProjectStatus(project.status),
        title: project.title,
        description: nextMilestone
          ? `Следващата важна стъпка е „${nextMilestone.title.toLowerCase()}“. ${project.professional.name} обнови проекта ${formatRelativeDate(project.updatedAt).toLowerCase()}.`
          : `${project.professional.name} поддържа проекта в движение. Проверете последните съобщения и следете статуса спокойно.`,
        metaLeft: project.professional.name,
        metaRight: project.deadline ?? "Срок по бриф",
        accent: project.payment
          ? `Плащане: ${project.payment.status === "COMPLETED" ? "защитено" : "очаква се"}`
          : `${project.progress}% напредък`,
        href: `/project/${project.id}`,
        cta: "Отвори проекта",
        image: pickDashboardArtwork(index + offerCards.length),
        updatedAt: project.updatedAt,
      };
    });

    const reviewCards = reviewDueProjects.map((project, index) => ({
      id: `review-${project.id}`,
      badge: "Остави отзив",
      title: project.title,
      description: `Проектът с ${project.professional.name} е приключил. Един кратък отзив ще помогне на следващите клиенти да изберат уверено.`,
      metaLeft: project.professional.name,
      metaRight: formatRelativeDate(project.updatedAt),
      accent: "Завършен проект",
      href: `/review/${project.id}`,
      cta: "Напиши отзив",
      image: pickDashboardArtwork(index + offerCards.length + projectCards.length),
      updatedAt: project.updatedAt,
    }));

    return [...offerCards, ...projectCards, ...reviewCards].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
  }, [activeProjects, pendingOffers, reviewDueProjects]);

  const statusCards = [
    {
      label: "Активни проекти",
      value: loading ? "..." : String(activeProjects.length).padStart(2, "0"),
      tone: "bg-primary-container text-on-primary-container",
      description: "Заявки и проекти, които имат нужда от поглед днес.",
    },
    {
      label: "Сигнали за избор",
      value: notificationsLoading ? "..." : String(pendingOffers.length + reviewDueProjects.length + unreadCount).padStart(2, "0"),
      tone: "bg-white/78 text-on-surface",
      description: "Оферти, чат и отзиви, които чакат вашето решение.",
    },
    {
      label: "Среден напредък",
      value: loading ? "..." : `${averageProgress}%`,
      tone: "bg-secondary/25 text-on-surface",
      description: "Колко плавно вървят активните ви проекти в момента.",
    },
  ];

  const topCard = cards[0];
  const remainingCards = cards.slice(1, 5);
  const feedbackMessage = error ?? notificationsError;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-4">
            <SectionEyebrow>Клиентско табло</SectionEyebrow>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.2rem]">
                  Добре дошъл, {getDisplayName(email)}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                  Вижте къде има движение по заявките ви, кои оферти чакат решение и кои проекти искат само още една спокойна стъпка.
                </p>
              </div>
              <Link
                href="/request/create"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
              >
                Нова заявка
                <span aria-hidden="true" className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </Link>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {statusCards.map((item) => (
              <div key={item.label} className={`rounded-[2rem] px-6 py-6 shadow-[0_18px_48px_rgba(77,66,96,0.08)] ${item.tone}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{item.label}</p>
                <p className="mt-6 text-5xl font-black tracking-[-0.06em]">{item.value}</p>
                <p className="mt-4 text-sm leading-7 opacity-80">{item.description}</p>
              </div>
            ))}
          </section>

          {feedbackMessage ? (
            <EditorialPanel className="p-5 text-sm text-error">{feedbackMessage}</EditorialPanel>
          ) : null}

          {topCard ? (
            <EditorialPanel className="overflow-hidden p-4 md:p-5">
              <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-center">
                <div className="overflow-hidden rounded-[2rem] bg-surface-container-low">
                  <Image
                    src={topCard.image}
                    alt={topCard.title}
                    width={960}
                    height={960}
                    sizes="(min-width: 1024px) 260px, 100vw"
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-5 p-2 md:p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                    <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">{topCard.badge}</span>
                    <span>{topCard.metaLeft}</span>
                    <span>{topCard.metaRight}</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-[-0.04em] md:text-[2.5rem]">{topCard.title}</h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">{topCard.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                      {topCard.accent}
                    </span>
                    <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                      {formatRelativeDate(topCard.updatedAt)}
                    </span>
                  </div>
                  <Link
                    href={topCard.href}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                  >
                    {topCard.cta}
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </EditorialPanel>
          ) : (
            <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
              Все още няма активни елементи в таблото. Създайте първата си заявка и Atelier ще поеме подредбата.
            </EditorialPanel>
          )}

          {remainingCards.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <SectionEyebrow>Вашите заявки</SectionEyebrow>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">Следващите спокойни решения</h2>
                </div>
                <Link
                  href="/requests"
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                >
                  Виж всички
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                {remainingCards.map((card, index) => (
                  <EditorialPanel key={card.id} className="overflow-hidden p-4">
                    <div className="grid gap-5 md:grid-cols-[170px_1fr] md:items-center">
                      <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                        <Image
                          src={pickDashboardArtwork(index + 1)}
                          alt={card.title}
                          width={720}
                          height={720}
                          sizes="(min-width: 768px) 170px, 100vw"
                          className="aspect-[4/5] h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-4 p-2 md:p-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                          <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">{card.badge}</span>
                          <span>{card.metaLeft}</span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-extrabold tracking-tight">{card.title}</h3>
                          <p className="mt-3 text-sm leading-7 text-on-surface-variant">{card.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                          <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{card.accent}</span>
                          <span>{formatRelativeDate(card.updatedAt)}</span>
                        </div>
                        <Link
                          href={card.href}
                          className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                        >
                          {card.cta}
                          <span aria-hidden="true" className="material-symbols-outlined text-lg">
                            arrow_forward
                          </span>
                        </Link>
                      </div>
                    </div>
                  </EditorialPanel>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}

