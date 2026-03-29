import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  getCustomerRequestsWorkspace,
  pickProfessionalArtwork,
  pickRequestArtwork,
} from "@/lib/customer-requests-workspace";

function formatRelativeDate(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) {
    return "току-що";
  }
  if (hours < 24) {
    return `преди ${hours} ч.`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `преди ${days} дни`;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
  }).format(value);
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
    case "CREATED":
      return "Стартиран проект";
    case "REVIEW":
      return "Преглед";
    case "DESIGN":
      return "В работа";
    case "APPROVAL":
      return "Чака одобрение";
    case "FINALIZATION":
      return "Финални детайли";
    case "COMPLETED":
      return "Завършен";
    default:
      return "Активен проект";
  }
}

function formatRequestStatus(status: string) {
  switch (status) {
    case "DRAFT":
      return "Чернова";
    case "PENDING":
      return "Подготвя се";
    case "MATCHING":
      return "AI търси съвпадения";
    case "OFFERS_RECEIVED":
      return "Оферти за избор";
    case "IN_PROGRESS":
      return "В изпълнение";
    case "COMPLETED":
      return "Завършена";
    default:
      return "Заявка";
  }
}

function buildCompareHref(request: {
  id: string;
  title: string;
  budget: string | null;
  timeline: string | null;
  location: string | null;
}) {
  const params = new URLSearchParams({
    requestId: request.id,
    query: request.title,
  });

  if (request.location) {
    params.set("city", request.location);
  }
  if (request.budget) {
    params.set("budget", request.budget);
  }
  if (request.timeline) {
    params.set("timeline", request.timeline);
  }

  return `/offers/compare?${params.toString()}`;
}

export default async function RequestsPage() {
  const auth = requireRole(await requireAuth(), ["CLIENT"]);
  const requests = await getCustomerRequestsWorkspace(auth.profile.id);

  if (requests.length === 0) {
    redirect("/requests/empty");
  }

  const offerDecisionCount = requests.filter((request) => request.status === "OFFERS_RECEIVED").length;
  const activeRequestCount = requests.filter((request) => {
    if (!request.project) {
      return ["PENDING", "MATCHING", "OFFERS_RECEIVED", "IN_PROGRESS"].includes(request.status);
    }

    return !["COMPLETED", "CANCELLED"].includes(request.project.status);
  }).length;
  const completedCount = requests.filter((request) => request.project?.status === "COMPLETED").length;

  const attentionRequests = requests.filter((request) => {
    if (request.status === "OFFERS_RECEIVED") {
      return true;
    }
    if (request.project?.payment && request.project.payment.status !== "COMPLETED") {
      return true;
    }
    return Boolean(request.project && request.project.status === "COMPLETED" && !request.project.review);
  });

  const activeRequests = requests.filter((request) => !request.project || request.project.status !== "COMPLETED");
  const completedRequests = requests.filter((request) => request.project?.status === "COMPLETED");

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Моите заявки</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.1rem]">
                Тук виждаш какво чака решение и кое вече върви напред.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Вместо разхвърляни карти и CRM шум, държим фокуса върху следващото действие:
                избор на оферта, потвърждение, плащане със защита и финален преглед.
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
                {offerDecisionCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface-variant">
                    {offerDecisionCount} {offerDecisionCount === 1 ? "заявка чака избор" : "заявки чакат избор"}
                  </span>
                ) : null}
              </div>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Обзор</SectionEyebrow>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Активни", value: activeRequestCount, tone: "text-primary" },
                  { label: "Оферти за избор", value: offerDecisionCount, tone: "text-secondary" },
                  { label: "Завършени", value: completedCount, tone: "text-tertiary" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.7rem] bg-surface-container-low px-5 py-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      {item.label}
                    </p>
                    <p className={`mt-3 text-4xl font-black tracking-tight ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-on-surface-variant">
                Данните се зареждат сървърно за текущия профил, така че страницата пристига готова за четене,
                без излишен client waterfall.
              </p>
            </EditorialPanel>
          </div>

          {attentionRequests.length > 0 ? (
            <section className="space-y-4">
              <div>
                <SectionEyebrow className="mb-4">Изискват внимание</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Най-важното за днес</h2>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {attentionRequests.map((request, index) => {
                  const bestOffer = request.offers[0];
                  const hasPendingPayment = Boolean(request.project?.payment && request.project.payment.status !== "COMPLETED");
                  const needsReview = Boolean(request.project?.status === "COMPLETED" && !request.project.review);
                  const href = request.status === "OFFERS_RECEIVED"
                    ? buildCompareHref(request)
                    : hasPendingPayment && request.project
                      ? `/payment?offerId=${request.project.offerId}&paymentId=${request.project.payment?.id}`
                      : needsReview && request.project
                        ? `/review/${request.project.id}`
                        : request.project
                          ? `/project/${request.project.id}`
                          : `/request/loading?requestId=${request.id}`;
                  const cta = request.status === "OFFERS_RECEIVED"
                    ? "Сравни офертите"
                    : hasPendingPayment
                      ? "Продължи към плащане"
                      : needsReview
                        ? "Остави отзив"
                        : "Отвори заявката";

                  return (
                    <EditorialPanel key={request.id} className="overflow-hidden p-3">
                      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                        <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                          <Image
                            src={pickRequestArtwork(request.status, index)}
                            alt={request.title}
                            width={640}
                            height={640}
                            sizes="(min-width: 1024px) 220px, 100vw"
                            className="aspect-[4/5] h-full w-full object-cover"
                          />
                        </div>
                        <div className="p-3 md:p-5">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                            <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                              {formatRequestStatus(request.status)}
                            </span>
                            {request.location ? <span>{request.location}</span> : null}
                            {request.budget ? <span>• {request.budget}</span> : null}
                          </div>
                          <h3 className="mt-4 text-2xl font-extrabold tracking-tight">{request.title}</h3>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                            {request.status === "OFFERS_RECEIVED"
                              ? `Получени са ${request.offers.length} оферти. ${bestOffer ? `Най-силното начало идва от ${bestOffer.professional.name} за ${formatCurrency(bestOffer.price)}.` : "AI е подготвил следващата стъпка за избор."}`
                              : hasPendingPayment
                                ? `Проектът вече е структуриран. Остава само да потвърдиш защитеното плащане, за да тръгне изпълнението.`
                                : needsReview
                                  ? `Проектът е приключен. Остави кратък отзив, за да заключиш доверието и историята по заявката.`
                                  : `Последна активност ${formatRelativeDate(request.updatedAt)}. ${request.project ? `Статус на проекта: ${formatProjectStatus(request.project.status)}.` : "AI продължава да подготвя правилните съвпадения."}`}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-3 text-sm text-on-surface-variant">
                            <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                              {request.timeline ?? "Срокът се уточнява"}
                            </span>
                            <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                              {bestOffer?.professional.verified ? "Проверен професионалист" : "Внимателен подбор"}
                            </span>
                          </div>
                          <Link
                            href={href}
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                          >
                            {cta}
                            <span aria-hidden="true" className="material-symbols-outlined text-lg">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </div>
                    </EditorialPanel>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div>
              <SectionEyebrow className="mb-4">Всички заявки</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Подредени по следваща стъпка</h2>
            </div>
            <div className="space-y-4">
              {activeRequests.map((request, index) => {
                const bestOffer = request.offers[0];
                const professional = request.project?.professional ?? bestOffer?.professional;
                const href = request.status === "OFFERS_RECEIVED"
                  ? buildCompareHref(request)
                  : request.project
                    ? `/project/${request.project.id}`
                    : `/request/loading?requestId=${request.id}`;
                const nextStep = request.status === "OFFERS_RECEIVED"
                  ? "Сравни и избери най-подходящата оферта."
                  : request.project?.status === "APPROVAL"
                    ? "Прегледай финалното предложение и потвърди посоката."
                    : request.project?.milestones.find((item) => !item.completed)
                      ? `Следващ етап: ${request.project.milestones.find((item) => !item.completed)?.title?.toLowerCase()}.`
                      : "AI и екипът подреждат следващите действия.";

                return (
                  <EditorialPanel key={request.id} className="p-4 md:p-5">
                    <div className="grid gap-5 lg:grid-cols-[160px_1fr_280px] lg:items-center">
                      <div className="overflow-hidden rounded-[1.6rem] bg-surface-container-low">
                        <Image
                          src={professional ? pickProfessionalArtwork(professional.portfolioImages, index) : pickRequestArtwork(request.status, index)}
                          alt={request.title}
                          width={640}
                          height={640}
                          sizes="(min-width: 1024px) 160px, 100vw"
                          className="aspect-[4/5] h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                          <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                            {request.project ? formatProjectStatus(request.project.status) : formatRequestStatus(request.status)}
                          </span>
                          <span>{formatRelativeDate(request.updatedAt)}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-extrabold tracking-tight">{request.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">{nextStep}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-sm">
                          {[request.location, request.budget, request.timeline].filter(Boolean).map((item) => (
                            <span key={item} className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Доверие и контекст
                        </p>
                        <p className="mt-2 text-on-surface">
                          {professional
                            ? `${professional.name}${professional.verified ? " • проверен професионалист" : ""}${professional.location ? ` • ${professional.location}` : ""}`
                            : "Заявката още е в AI маршрутизиране."}
                        </p>
                        <p className="mt-3">
                          {bestOffer
                            ? `Най-добра налична оферта: ${formatCurrency(bestOffer.price)} • срок ${bestOffer.timeline} дни.`
                            : request.project?.payment
                              ? `Плащане: ${request.project.payment.status.toLowerCase()} • общо ${formatCurrency(request.project.payment.total)}.`
                              : "Следим заявката вместо теб и ще покажем следващия смислен ход."}
                        </p>
                        <Link
                          href={href}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)] transition-colors hover:bg-surface-container-lowest"
                        >
                          Отвори
                        </Link>
                      </div>
                    </div>
                  </EditorialPanel>
                );
              })}
            </div>
          </section>

          {completedRequests.length > 0 ? (
            <section className="space-y-4">
              <div>
                <SectionEyebrow className="mb-4">Приключени заявки</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">История на доверието</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {completedRequests.map((request, index) => (
                  <EditorialPanel key={request.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="overflow-hidden rounded-[1.4rem] bg-surface-container-low">
                        <Image
                          src={pickRequestArtwork("COMPLETED", index)}
                          alt={request.title}
                          width={120}
                          height={120}
                          className="h-24 w-24 object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Завършено {formatRelativeDate(request.updatedAt)}
                        </p>
                        <h3 className="mt-2 text-xl font-extrabold tracking-tight">{request.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                          {request.project?.review
                            ? "Има публикуван отзив и историята по проекта е заключена." 
                            : "Проектът е приключил. Остава само кратък отзив, за да завършим цикъла на доверие."}
                        </p>
                        <Link
                          href={request.project?.review ? `/project/${request.project.id}` : `/review/${request.project?.id}`}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                        >
                          {request.project?.review ? "Виж проекта" : "Остави отзив"}
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
