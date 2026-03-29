import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { OfferDecisionActions } from "@/components/offer-decision-actions";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/http";
import { ensureOfferAccess } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { toRequestSearchParams } from "@/lib/request-flow";

type Params = Promise<{ id: string }>;

type AccessibleOffer = Awaited<ReturnType<typeof ensureOfferAccess>>;
type OfferReview = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  reviewer: {
    name: string;
  };
  project: {
    title: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function buildContextQuery(offer: AccessibleOffer) {
  const params = toRequestSearchParams({
    query: offer.request.title,
    city: offer.request.location ?? undefined,
    budget: offer.request.budget ?? undefined,
    timeline: offer.request.timeline ?? undefined,
    scope: offer.request.area ?? undefined,
    priority: offer.request.priorities[0] ?? undefined,
    style: offer.request.priorities[1] ?? undefined,
    notes: offer.request.specificNotes ?? undefined,
  });
  params.set("requestId", offer.request.id);
  return params.toString();
}

function computeFitScore(offer: AccessibleOffer) {
  let score = 76;

  if (offer.featured) {
    score += 9;
  }
  if (offer.professional.verified) {
    score += 6;
  }
  score += Math.min(Math.round(offer.professional.rating * 2), 10);
  score += Math.min(Math.floor(offer.professional.reviewCount / 40), 6);

  if (
    offer.request.location &&
    offer.professional.location === offer.request.location
  ) {
    score += 4;
  }

  if ((offer.professional.skills?.length ?? 0) >= 3) {
    score += 3;
  }

  return Math.min(score, 98);
}

function buildFitSummary(offer: AccessibleOffer) {
  const score = computeFitScore(offer);
  const skills = offer.professional.skills.slice(0, 3).join(" · ");
  const quote = offer.quote?.trim();

  if (quote) {
    return quote;
  }

  return `Тази оферта влиза със съвпадение ${score}/100 към заявката ти и се опира на ${skills || "релевантен опит"}, верификация и реален клиентски рейтинг.`;
}

function buildWhyMatched(offer: AccessibleOffer) {
  return [
    offer.professional.verified
      ? "Профилът е верифициран в Atelier."
      : "Профилът още няма пълна верификация.",
    offer.professional.location && offer.request.location
      ? `Локация: ${offer.professional.location} спрямо ${offer.request.location}.`
      : "Локацията не е водещ фактор за това съвпадение.",
    offer.professional.skills.length > 0
      ? `Ключови умения: ${offer.professional.skills.slice(0, 3).join(", ")}.`
      : "Fit-ът идва основно от обхвата и срока.",
  ];
}

function buildTrustChecks(offer: AccessibleOffer) {
  return [
    offer.professional.verified
      ? "Проверен професионалист с активен профил в Atelier."
      : "Профилът е достъпен, но без завършена верификация.",
    offer.professional.experience
      ? `${offer.professional.experience} години деклариран релевантен опит.`
      : "Опитът ще се валидира през chat и onboarding историята.",
    offer.professional.reviewCount > 0
      ? `${offer.professional.reviewCount} клиентски ревюта с рейтинг ${offer.professional.rating.toFixed(1)}.`
      : "Все още няма натрупани клиентски ревюта в платформата.",
    offer.project
      ? "Офертата вече е вързана към активен project flow."
      : "Плащането и стартът минават през защитения checkout на Atelier.",
  ];
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`material-symbols-outlined text-lg ${
            index < count ? "text-amber-400" : "text-on-surface/20"
          }`}
          style={index < count ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          star
        </span>
      ))}
    </div>
  );
}

function OfferState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />
      <main className="flex-1 px-6 pb-24 pt-34 md:pt-40">
        <div className="mx-auto max-w-4xl">
          <EditorialPanel className="p-8 md:p-10">
            <SectionEyebrow className="mb-4">Детайл на офертата</SectionEyebrow>
            <h1 className="text-[2.4rem] font-extrabold tracking-[-0.06em] md:text-[4rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
              {description}
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
            >
              Назад към таблото
            </Link>
          </EditorialPanel>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function OfferDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let authRole: "CLIENT" | "PROFESSIONAL" | null = null;
  let offer: AccessibleOffer | null = null;
  let reviews: OfferReview[] = [];
  let loadError: string | null = null;

  try {
    const auth = await requireAuth();
    authRole = auth.profile.role;
    offer = await ensureOfferAccess(id, auth);
    reviews = await prisma.review.findMany({
      where: { professionalId: offer.professionalId },
      include: {
        reviewer: true,
        project: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
  } catch (error) {
    loadError =
      error instanceof AppError
        ? error.message
        : "Не успяхме да заредим реалната оферта.";
  }

  if (!offer || !authRole) {
    return (
      <OfferState
        title="Тази оферта не е достъпна."
        description={loadError ?? "Не успяхме да заредим реалната оферта."}
      />
    );
  }

  const contextQuery = buildContextQuery(offer);
  const portfolioImages = [
    ...offer.portfolioImages,
    ...offer.professional.portfolioImages,
  ].filter(Boolean);
  const secondaryHref = `/offers/compare?${contextQuery}`;
  const fitSummary = buildFitSummary(offer);
  const whyMatched = buildWhyMatched(offer);
  const trustChecks = buildTrustChecks(offer);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <EditorialPanel className="p-6 md:p-8">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <SectionEyebrow className="mb-4">Детайл на офертата</SectionEyebrow>
                <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.3rem]">
                  {offer.professional.name}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                  {fitSummary}
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                  {[offer.request.location, offer.request.budget, offer.request.timeline, offer.request.area]
                    .filter(Boolean)
                    .map((item) => (
                      <span key={item} className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface">
                        {item}
                      </span>
                    ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Контекст на заявката
                </p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {offer.request.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {offer.request.description}
                </p>
              </div>
            </div>
          </EditorialPanel>

          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <EditorialPanel className="overflow-hidden p-3">
              {portfolioImages[0] ? (
                <div className="overflow-hidden rounded-[2rem] bg-surface-container-low">
                  <Image
                    src={portfolioImages[0]}
                    alt={offer.professional.name}
                    width={960}
                    height={1200}
                    sizes="(min-width: 1024px) 28rem, 100vw"
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-end overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(151,131,184,0.26),rgba(255,255,255,0.76))] p-8">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                      Активна оферта
                    </p>
                    <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.05em] text-primary">
                      {offer.professional.name}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                      {offer.scope}
                    </p>
                  </div>
                </div>
              )}
            </EditorialPanel>

            <div className="space-y-5">
              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Профил на доверие</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
                  Съвпадение {computeFitScore(offer)}/100 за твоята заявка
                </h2>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                  {offer.professional.bio?.trim() || `${offer.professional.name} е активен професионалист в Atelier с фокус върху ${offer.professional.skills.slice(0, 3).join(", ") || "релевантни проекти"}.`}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    { label: "Верификация", value: offer.professional.verified ? "Проверен професионалист" : "Непълна верификация" },
                    { label: "Опит", value: offer.professional.experience ? `${offer.professional.experience} години` : "Не е посочен" },
                    { label: "Ревюта", value: `${offer.professional.rating.toFixed(1)} · ${offer.professional.reviewCount} оценки` },
                    { label: "Локация", value: offer.professional.location ?? "Не е посочена" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                        {item.label}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-on-surface">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {offer.professional.skills.length > 0 ? offer.professional.skills.map((item) => (
                    <span key={item} className="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)]">
                      {item}
                    </span>
                  )) : (
                    <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)]">
                      подредено изпълнение
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <OfferDecisionActions
                    role={authRole}
                    offerId={offer.id}
                    offerStatus={offer.status}
                    paymentHref={`/payment?offerId=${offer.id}&requestId=${offer.request.id}`}
                    compareHref={secondaryHref}
                    projectHref={offer.project ? `/project/${offer.project.id}` : null}
                    dashboardHref="/pro/dashboard"
                  />
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Защо пасва на тази заявка</SectionEyebrow>
                <div className="grid gap-4 md:grid-cols-3">
                  {whyMatched.map((item) => (
                    <div key={item} className="rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                      {item}
                    </div>
                  ))}
                </div>
              </EditorialPanel>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Сигнали за доверие</SectionEyebrow>
              <div className="space-y-4">
                {trustChecks.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined mt-0.5 text-primary"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: "20px" }}
                    >
                      verified
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Параметри на офертата</SectionEyebrow>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { label: "Цена", value: formatCurrency(offer.price) },
                  { label: "Срок", value: `${offer.timeline} дни` },
                  { label: "Ревизии", value: offer.revisions?.trim() || "Уточняват се" },
                  { label: "Гаранция", value: offer.warranty?.trim() || "По договаряне" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      {item.label}
                    </p>
                    <p className="mt-3 text-xl font-extrabold tracking-tight text-on-surface">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                {offer.scope}
              </div>
            </EditorialPanel>
          </div>

          <EditorialPanel className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow className="mb-4">Портфолио</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Последователни сигнали за вкус и изпълнение</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-on-surface-variant">
                Показваме реални активи от профила и самата оферта. Ако професионалистът още не е качил публично портфолио, не симулираме фалшив декоративен заместител.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {portfolioImages.length > 0 ? (
                portfolioImages.slice(0, 3).map((src, index) => (
                  <div key={`${src}-${index}`} className="overflow-hidden rounded-[1.9rem] bg-surface-container-low">
                    <Image
                      src={src}
                      alt={`${offer.professional.name} портфолио ${index + 1}`}
                      width={960}
                      height={720}
                      sizes="(min-width: 1024px) 20rem, 100vw"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                    <div className="px-5 py-4">
                      <p className="text-sm font-bold text-on-surface">Портфолио актив {index + 1}</p>
                    </div>
                  </div>
                ))
              ) : (
                [offer.scope, offer.quote?.trim() || "Офертата още няма качени визуални активи.", offer.request.title].map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-[1.9rem] bg-surface-container-low px-5 py-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Вместо фалшива галерия
                    </p>
                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">{item}</p>
                  </div>
                ))
              )}
            </div>
          </EditorialPanel>

          <EditorialPanel className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionEyebrow className="mb-4">Ревюта</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em]">Какво казват реалните клиенти</h2>
              </div>
              <div className="flex items-center gap-3">
                <StarRow count={Math.round(offer.professional.rating || 0)} />
                <span className="text-sm font-bold text-on-surface">
                  {offer.professional.rating.toFixed(1)} · {offer.professional.reviewCount} оценки
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                    <StarRow count={review.rating} />
                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">&quot;{review.comment}&quot;</p>
                    <div className="mt-5">
                      <p className="text-sm font-bold text-on-surface">{review.reviewer.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/70">
                        {review.project.title} · {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant lg:col-span-2">
                  Все още няма публикувани ревюта за този професионалист. Не симулираме оценки, когато няма реални данни.
                </div>
              )}
            </div>
          </EditorialPanel>
        </div>
      </main>

      <Footer />
    </div>
  );
}
