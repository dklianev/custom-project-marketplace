import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/http";
import { ensureRequestAccess } from "@/lib/marketplace";
import { toRequestSearchParams } from "@/lib/request-flow";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AccessibleRequest = Awaited<ReturnType<typeof ensureRequestAccess>>;
type RequestOffer = AccessibleRequest["offers"][number];

function takeFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildContextQuery(request: AccessibleRequest) {
  const params = toRequestSearchParams({
    query: request.title,
    city: request.location ?? undefined,
    budget: request.budget ?? undefined,
    timeline: request.timeline ?? undefined,
    scope: request.area ?? undefined,
    priority: request.priorities[0] ?? undefined,
    style: request.priorities[1] ?? undefined,
    notes: request.specificNotes ?? undefined,
  });
  params.set("requestId", request.id);
  return params.toString();
}

function computeFitScore(offer: RequestOffer, request: AccessibleRequest) {
  let score = 76;

  if (offer.featured) score += 9;
  if (offer.professional.verified) score += 6;
  score += Math.min(Math.round(offer.professional.rating * 2), 10);
  score += Math.min(Math.floor(offer.professional.reviewCount / 40), 6);
  if (request.location && offer.professional.location === request.location) score += 4;
  if ((offer.professional.skills?.length ?? 0) >= 3) score += 3;

  return Math.min(score, 98);
}

function buildReason(offer: RequestOffer, request: AccessibleRequest) {
  if (offer.quote?.trim()) {
    return offer.quote.trim();
  }

  const skill = offer.professional.skills?.[0] ?? "подобни проекти";
  const locationMatch =
    request.location && offer.professional.location === request.location
      ? "Има и локален контекст за проекта."
      : "Покрива добре типа работа и очаквания срок.";

  return `${offer.professional.name} има опит в ${skill.toLowerCase()} и предлага подреден подход към този бриф. ${locationMatch}`;
}

function buildDisplayOffers(offers: RequestOffer[]) {
  if (offers.length < 3) {
    return offers;
  }

  return [offers[1], offers[0], offers[2]];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CompareEmptyState({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />
      <main className="flex-1 px-6 pb-24 pt-34 md:pt-40">
        <div className="mx-auto max-w-4xl">
          <EditorialPanel className="p-8 md:p-10">
            <SectionEyebrow className="mb-4">Сравняване на оферти</SectionEyebrow>
            <h1 className="text-[2.4rem] font-extrabold tracking-[-0.06em] md:text-[4rem]">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">{description}</p>
            <Link
              href={href}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
            >
              {cta}
            </Link>
          </EditorialPanel>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function CompareOffersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestId = takeFirst(params.requestId);

  if (!requestId) {
    return (
      <CompareEmptyState
        title="Нямаме заявка за сравнение."
        description="Отвори конкретна заявка от таблото си и тогава ще подредим офертите в една спокойна decision room среда."
        href="/dashboard"
        cta="Към таблото"
      />
    );
  }

  let request: AccessibleRequest | null = null;
  let loadError: string | null = null;

  try {
    const auth = await requireAuth();
    request = await ensureRequestAccess(requestId, auth);
  } catch (error) {
    loadError =
      error instanceof AppError
        ? error.message
        : "Не успяхме да заредим офертите за тази заявка.";
  }

  if (!request) {
    return (
      <CompareEmptyState
        title="Тази заявка не е достъпна в момента."
        description={loadError ?? "Не успяхме да заредим офертите за тази заявка."}
        href="/dashboard"
        cta="Назад към таблото"
      />
    );
  }

  const offers = request.offers
    .filter((offer) => offer.status === "PENDING" || offer.status === "ACCEPTED")
    .sort((left, right) => computeFitScore(right, request) - computeFitScore(left, request));

  if (offers.length === 0) {
    return (
      <CompareEmptyState
        title="Все още няма оферти за тази заявка."
        description="Atelier ще покаже сравнение веднага щом има подготвени предложения от подходящите професионалисти."
        href="/request/loading"
        cta="Виж статуса"
      />
    );
  }

  const displayOffers = buildDisplayOffers(offers).slice(0, 3);
  const contextQuery = buildContextQuery(request);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <SectionEyebrow className="mb-5">Сравняване на оферти</SectionEyebrow>
            <h1 className="mx-auto max-w-4xl text-[2.7rem] font-extrabold leading-[0.98] tracking-[-0.06em] md:text-[4.8rem]">
              Вашият идеален <span className="bg-[linear-gradient(120deg,#553e60_0%,#6b86d1_100%)] bg-clip-text text-transparent">партньор</span>
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
              Atelier подбра офертите, които най-добре съвпадат с тази заявка, според опит, доверие,
              срок и предложен подход.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm text-on-surface-variant">
            {[request.location, request.budget, request.timeline]
              .filter(Boolean)
              .map((item) => (
                <span key={item} className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                  {item}
                </span>
              ))}
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-3">
            {displayOffers.map((offer, index) => {
              const highlighted = index === 1 || (displayOffers.length === 1 && index === 0);
              const fitScore = computeFitScore(offer, request);
              const detailHref = `/offers/${offer.id}?${contextQuery}`;
              const featuredLabel = highlighted ? "AI препоръка" : offer.professional.verified ? "Проверен профил" : "Подбран профил";

              return (
                <div
                  key={offer.id}
                  className={highlighted ? "rounded-[2.4rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(110,86,120,0.12),rgba(255,255,255,0.96))] px-6 py-7 shadow-[0_28px_80px_rgba(85,62,96,0.12)]" : "rounded-[2.4rem] bg-white/86 px-6 py-7 shadow-[0_24px_70px_rgba(77,66,96,0.08)]"}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <span className={highlighted ? "rounded-full bg-primary px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-on-primary" : "rounded-full bg-surface-container-low px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary/80"}>
                        {featuredLabel}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">{offer.professional.verified ? "Verified" : "Curated"}</span>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-primary-fixed text-lg font-black text-primary shadow-[0_12px_30px_rgba(85,62,96,0.08)]">
                        {getInitials(offer.professional.name)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">{offer.professional.name}</h2>
                        <p className="mt-1 text-sm text-on-surface-variant">{offer.professional.location || "Работи дистанционно"}</p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-[1.5rem] bg-surface-container-low px-3 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Цена</p>
                        <p className="mt-2 text-sm font-extrabold text-on-surface">{formatCurrency(offer.price)}</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-surface-container-low px-3 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Срок</p>
                        <p className="mt-2 text-sm font-extrabold text-on-surface">{offer.timeline} дни</p>
                      </div>
                      <div className="rounded-[1.5rem] bg-surface-container-low px-3 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Fit</p>
                        <p className="mt-2 text-sm font-extrabold text-on-surface">{fitScore}%</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 text-sm leading-7 text-on-surface-variant">
                      <p>{buildReason(offer, request)}</p>
                      <p>Рейтинг {offer.professional.rating.toFixed(1)} · {offer.professional.reviewCount} отзива</p>
                      <p>{offer.scope}</p>
                    </div>

                    <div className="mt-6 flex-1 rounded-[1.7rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                      {offer.quote?.trim() || "Предложението е структурирано за този бриф и може да бъде прието веднага или прегледано детайлно."}
                    </div>

                    <div className="mt-6 space-y-3">
                      <Link
                        href={detailHref}
                        className={highlighted ? "inline-flex w-full items-center justify-center rounded-[1.4rem] bg-[linear-gradient(120deg,#553e60_0%,#6e5678_100%)] px-5 py-4 text-sm font-black text-on-primary shadow-[0_20px_44px_rgba(85,62,96,0.2)] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-95" : "inline-flex w-full items-center justify-center rounded-[1.4rem] bg-primary/10 px-5 py-4 text-sm font-black text-primary transition-colors hover:bg-primary hover:text-on-primary"}
                      >
                        Избери тази оферта
                      </Link>
                      <Link
                        href={`${detailHref}#decision`}
                        className="inline-flex w-full items-center justify-center rounded-[1.4rem] bg-white/88 px-5 py-4 text-sm font-bold text-on-surface shadow-[0_12px_28px_rgba(77,66,96,0.05)] transition-colors hover:bg-white"
                      >
                        Прегледай детайлите
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="mt-20 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="relative overflow-hidden rounded-[2.4rem] bg-surface-container-low shadow-[0_28px_80px_rgba(77,66,96,0.08)]">
              <div className="relative h-[320px] w-full">
                <Image
                  src="/editorial/request-active.svg"
                  alt="Среща с професионалист"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <SectionEyebrow className="mb-5">Сигурност при всяка транзакция</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-on-surface md:text-5xl">
                Избираш оферта, без да губиш контрол над процеса.
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  "Защитено плащане и ясен handoff към проекта след избор.",
                  "Преглед на профила, условията и стъпките преди окончателно решение.",
                  "След избора всичко минава през статус, чат и прозрачни следващи действия.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.6rem] bg-white/82 px-4 py-4 shadow-[0_12px_30px_rgba(77,66,96,0.05)]">
                    <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified_user
                    </span>
                    <p className="text-sm leading-7 text-on-surface-variant">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
