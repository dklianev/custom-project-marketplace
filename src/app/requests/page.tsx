import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import {
  getCustomerRequestsWorkspace,
  pickProfessionalArtwork,
  pickRequestArtwork,
} from "@/lib/customer-requests-workspace";
import { requireAuth, requireRole } from "@/lib/auth";

function formatRelativeDate(value: string | Date) {
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
    default:
      return status;
  }
}

function formatRequestStatus(status: string) {
  switch (status) {
    case "DRAFT":
      return "Чернова";
    case "PENDING":
      return "Подготвя се";
    case "MATCHING":
      return "AI подбира";
    case "OFFERS_RECEIVED":
      return "Нови оферти";
    case "IN_PROGRESS":
      return "В работа";
    case "COMPLETED":
      return "Приключена";
    default:
      return status;
  }
}

function buildCompareHref(requestId: string, title: string) {
  return `/offers/compare?requestId=${requestId}&query=${encodeURIComponent(title)}`;
}

function formatDeadline(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
  }).format(new Date(value));
}

export default async function RequestsPage() {
  const auth = requireRole(await requireAuth(), ["CLIENT"]);
  const requests = await getCustomerRequestsWorkspace(auth.profile.id);

  if (requests.length === 0) {
    redirect("/requests/empty");
  }

  const activeRequests = requests.filter(
    (request) => !request.project || request.project.status !== "COMPLETED",
  );
  const completedRequests = requests.filter(
    (request) => request.project?.status === "COMPLETED",
  );
  const decisionsPending = requests.filter(
    (request) => request.status === "OFFERS_RECEIVED",
  );

  const featured = activeRequests[0] ?? requests[0];
  const secondary = requests.filter((request) => request.id !== featured.id).slice(0, 3);

  const progressSteps = [
    { label: "Бриф", active: true },
    {
      label: "Оферти",
      active: ["OFFERS_RECEIVED", "IN_PROGRESS", "COMPLETED"].includes(featured.status),
    },
    { label: "Проект", active: Boolean(featured.project) },
    { label: "Отзив", active: Boolean(featured.project?.review) },
  ];

  const featuredHref = featured.project?.status === "COMPLETED" && !featured.project.review
    ? `/review/${featured.project.id}`
    : featured.status === "OFFERS_RECEIVED"
      ? buildCompareHref(featured.id, featured.title)
      : featured.project
        ? `/project/${featured.project.id}`
        : `/request/loading?requestId=${featured.id}`;

  const featuredCta = featured.project?.status === "COMPLETED" && !featured.project.review
    ? "Остави отзив"
    : featured.status === "OFFERS_RECEIVED"
      ? "Прегледай офертите"
      : featured.project
        ? "Отвори проекта"
        : "Виж статуса";

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-4">
            <SectionEyebrow>Моите заявки</SectionEyebrow>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.1rem]">
              Вашите проекти
            </h1>
            <p className="max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
              Следете заявките и проектите си на едно място. Atelier подрежда офертите, статуса и следващата стъпка, без излишен шум.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Активни",
                value: String(activeRequests.length).padStart(2, "0"),
                tone: "bg-white/82 text-on-surface",
              },
              {
                label: "Очаквани оферти",
                value: String(decisionsPending.length).padStart(2, "0"),
                tone: "bg-surface-container-low text-on-surface",
              },
              {
                label: "Завършени",
                value: String(completedRequests.length).padStart(2, "0"),
                tone: "bg-secondary/25 text-on-surface",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-[2rem] px-6 py-6 shadow-[0_18px_48px_rgba(77,66,96,0.08)] ${item.tone}`}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">{item.label}</p>
                <p className="mt-6 text-5xl font-black tracking-[-0.06em]">{item.value}</p>
              </div>
            ))}
          </section>

          <EditorialPanel className="overflow-hidden p-4 md:p-5">
            <div className="grid gap-6 lg:grid-cols-[230px_1fr] lg:items-center">
              <div className="overflow-hidden rounded-[2rem] bg-surface-container-low">
                <Image
                  src={featured.project?.professional ? pickProfessionalArtwork(featured.project.professional.portfolioImages, 0) : pickRequestArtwork(featured.status, 0)}
                  alt={featured.title}
                  width={960}
                  height={960}
                  sizes="(min-width: 1024px) 230px, 100vw"
                  className="aspect-[4/5] h-full w-full object-cover"
                />
              </div>
              <div className="space-y-5 p-2 md:p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                  <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                    {featured.project ? formatProjectStatus(featured.project.status) : formatRequestStatus(featured.status)}
                  </span>
                  {featured.location ? <span>{featured.location}</span> : null}
                  {featured.budget ? <span>{featured.budget}</span> : null}
                </div>

                <div>
                  <h2 className="text-3xl font-extrabold tracking-[-0.04em] md:text-[2.5rem]">{featured.title}</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">
                    {featured.project
                      ? `${featured.project.professional.name} движи проекта спокойно. ${formatDeadline(featured.project.deadline) ? `Срокът е ${formatDeadline(featured.project.deadline)}.` : "Следете следващата важна стъпка и файловете за преглед."}`
                      : featured.status === "OFFERS_RECEIVED"
                        ? `Имате ${featured.offers.length} подредени оферти за избор. Atelier е събрал правилните професионалисти и остава само да сравните спокойно.`
                        : "AI все още доуточнява и подбира правилните професионалисти за тази заявка."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {progressSteps.map((step) => (
                    <div key={step.label} className={`rounded-[1.5rem] px-4 py-4 text-sm font-semibold ${step.active ? "bg-primary/10 text-primary" : "bg-surface-container-low text-on-surface-variant"}`}>
                      {step.label}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
                  <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                    Обновено {formatRelativeDate(featured.updatedAt).toLowerCase()}
                  </span>
                  {featured.project?.professional ? (
                    <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                      {featured.project.professional.name}
                    </span>
                  ) : null}
                </div>

                <Link
                  href={featuredHref}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                >
                  {featuredCta}
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          </EditorialPanel>

          {secondary.length > 0 ? (
            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {secondary.map((request, index) => {
                const href = request.project?.status === "COMPLETED" && !request.project.review
                  ? `/review/${request.project.id}`
                  : request.status === "OFFERS_RECEIVED"
                    ? buildCompareHref(request.id, request.title)
                    : request.project
                      ? `/project/${request.project.id}`
                      : `/request/loading?requestId=${request.id}`;

                return (
                  <EditorialPanel key={request.id} className="overflow-hidden p-3">
                    <div className="overflow-hidden rounded-[1.8rem] bg-surface-container-low">
                      <Image
                        src={request.project?.professional ? pickProfessionalArtwork(request.project.professional.portfolioImages, index + 1) : pickRequestArtwork(request.status, index + 1)}
                        alt={request.title}
                        width={720}
                        height={720}
                        sizes="(min-width: 1280px) 18rem, (min-width: 768px) 40vw, 100vw"
                        className="aspect-[4/3] h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4 md:p-5">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                        <span className="rounded-full bg-primary/8 px-3 py-1 font-semibold text-primary">
                          {request.project ? formatProjectStatus(request.project.status) : formatRequestStatus(request.status)}
                        </span>
                        <span>{formatRelativeDate(request.updatedAt)}</span>
                      </div>
                      <h3 className="mt-4 text-2xl font-extrabold tracking-tight">{request.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                        {request.project
                          ? `${request.project.professional.name} поддържа проекта в движение. ${request.project.payment ? `Плащането е ${request.project.payment.status === "COMPLETED" ? "потвърдено" : "в изчакване"}.` : "Следете файловете и съобщенията."}`
                          : request.status === "OFFERS_RECEIVED"
                            ? `${request.offers.length} оферти са готови за сравнение.`
                            : "Заявката все още се насочва към правилните професионалисти."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                        {request.budget ? <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{request.budget}</span> : null}
                        {request.timeline ? <span className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">{request.timeline}</span> : null}
                      </div>
                      <Link
                        href={href}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2.5 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                      >
                        Отвори
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                      </Link>
                    </div>
                  </EditorialPanel>
                );
              })}
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
