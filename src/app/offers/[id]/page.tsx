import Image from "next/image";
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
    month: "short",
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

  if (offer.featured) score += 9;
  if (offer.professional.verified) score += 6;
  score += Math.min(Math.round(offer.professional.rating * 2), 10);
  score += Math.min(Math.floor(offer.professional.reviewCount / 40), 6);

  if (offer.request.location && offer.professional.location === offer.request.location) {
    score += 4;
  }

  if ((offer.professional.skills?.length ?? 0) >= 3) {
    score += 3;
  }

  return Math.min(score, 98);
}

function buildWhyMatched(offer: AccessibleOffer) {
  return [
    offer.professional.verified
      ? "Профилът е минал през проверка и има история в Atelier."
      : "Профилът все още изгражда история, но вече има съвпадащи проекти.",
    offer.professional.location && offer.request.location
      ? `Локацията ${offer.professional.location} е в синхрон със заявката ${offer.request.location}.`
      : "Гъвкава е спрямо локацията и начина на работа.",
    offer.professional.skills.length > 0
      ? `Специализациите включват ${offer.professional.skills.slice(0, 3).join(", ")}.`
      : "Предложението е структурирано спрямо обхвата и нуждите на заявката.",
  ];
}

function buildTrustChecks(offer: AccessibleOffer) {
  return [
    offer.professional.verified
      ? "Верифициран профил с активна идентичност и защитена комуникация."
      : "Плащането остава защитено, дори когато профилът още е в процес на разширена верификация.",
    offer.professional.experience
      ? `${offer.professional.experience} години професионален опит в сходни проекти.`
      : "Опитът се вижда през портфолиото, комуникацията и реалните клиентски оценки.",
    offer.project
      ? "Приемането на офертата ще те върне към активния проект и неговия защитен чат."
      : "След приемане офертата влиза в защитения checkout и се превръща в активен проект.",
  ];
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
            <SectionEyebrow className="mb-4">Профил и оферта</SectionEyebrow>
            <h1 className="text-[2.4rem] font-extrabold tracking-[-0.06em] md:text-[4rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
              {description}
            </p>
          </EditorialPanel>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`material-symbols-outlined text-lg ${
            index < rating ? "text-amber-400" : "text-on-surface/20"
          }`}
          style={index < rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          star
        </span>
      ))}
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
      take: 3,
    });
  } catch (error) {
    loadError =
      error instanceof AppError
        ? error.message
        : "Не успяхме да заредим избраната оферта.";
  }

  if (!offer || !authRole) {
    return (
      <OfferState
        title="Офертата не е налична"
        description={loadError ?? "Не успяхме да заредим избраната оферта."}
      />
    );
  }

  const contextQuery = buildContextQuery(offer);
  const portfolioImages = [
    ...offer.portfolioImages,
    ...offer.professional.portfolioImages,
  ].filter(Boolean);
  const gallery = [...portfolioImages, "/editorial/portfolio-01.svg", "/editorial/portfolio-02.svg"].slice(0, 3);
  const compareHref = `/offers/compare?${contextQuery}`;
  const fitScore = computeFitScore(offer);
  const whyMatched = buildWhyMatched(offer);
  const trustChecks = buildTrustChecks(offer);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
            <EditorialPanel className="p-4">
              <div className="overflow-hidden rounded-[1.7rem] bg-surface-container-low">
                <Image
                  src={offer.professional.avatarUrl ?? "/editorial/avatar-pro.svg"}
                  alt={offer.professional.name}
                  width={520}
                  height={620}
                  sizes="240px"
                  className="aspect-[4/5] h-full w-full object-cover"
                  priority
                />
              </div>
              <div className="px-2 pb-2 pt-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/65">
                  Проверен профил
                </p>
                <h2 className="mt-2 text-lg font-extrabold text-on-surface">
                  {offer.professional.name}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {offer.professional.location ?? offer.request.location ?? "По заявката"}
                </p>
              </div>
            </EditorialPanel>

            <div className="space-y-6">
              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Профил и оферта</SectionEyebrow>
                <h1 className="max-w-3xl text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.06em] text-on-surface md:text-[4.2rem]">
                  Експертно предложение за „{offer.request.title}“
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                  {offer.quote?.trim() || `${offer.professional.name} предлага спокоен процес, ясен обхват и изпълнение, съобразено с твоята заявка.`}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface">
                    Съвпадение {fitScore}/100
                  </span>
                  <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface">
                    {formatCurrency(offer.price)}
                  </span>
                  <span className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface">
                    {offer.timeline} дни
                  </span>
                </div>
                <div className="mt-6">
                  <OfferDecisionActions
                    role={authRole}
                    offerId={offer.id}
                    offerStatus={offer.status}
                    paymentHref={`/payment?offerId=${offer.id}&requestId=${offer.request.id}`}
                    compareHref={compareHref}
                    projectHref={offer.project ? `/project/${offer.project.id}` : null}
                    dashboardHref={authRole === "PROFESSIONAL" ? "/pro/dashboard" : "/dashboard"}
                  />
                </div>
              </EditorialPanel>

              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <EditorialPanel className="p-6 md:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <SectionEyebrow className="mb-4">Детайли по предложението</SectionEyebrow>
                      <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">
                        Подредено предложение за твоя проект
                      </h2>
                    </div>
                    <p className="text-sm font-semibold text-on-surface-variant">
                      Съвпадение {fitScore}/100
                    </p>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[
                      { label: "Обхват на работата", value: offer.scope },
                      { label: "Термини за проекта", value: offer.request.timeline ?? "По уговорка" },
                      { label: "Цена", value: formatCurrency(offer.price) },
                      { label: "Ревизии", value: offer.revisions?.trim() || "По договаряне" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.7rem] bg-surface-container-low px-5 py-5">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {item.label}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {whyMatched.map((item) => (
                      <div key={item} className="rounded-[1.6rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                        {item}
                      </div>
                    ))}
                  </div>
                </EditorialPanel>

                <EditorialPanel className="p-6 md:p-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    От {formatCurrency(offer.price)}
                  </p>
                  <p className="mt-4 text-[3rem] font-extrabold leading-none tracking-[-0.06em] text-primary">
                    {offer.price.toLocaleString("bg-BG")} лв.
                  </p>
                  <div className="mt-6 space-y-4 text-sm leading-7 text-on-surface-variant">
                    {trustChecks.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
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
              </div>
            </div>
          </div>

          <section>
            <div className="mb-6 flex items-end justify-between gap-5">
              <div>
                <SectionEyebrow className="mb-4">Портфолио и резултати от проекти</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
                  Какво казват визуалните резултати
                </h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-[2.25rem] bg-white/86 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <Image
                  src={gallery[0]}
                  alt={`${offer.professional.name} проект`}
                  width={1200}
                  height={900}
                  sizes="(min-width: 1024px) 42rem, 100vw"
                  className="aspect-[4/3] h-full w-full object-cover"
                />
              </div>
              <div className="grid gap-4">
                {gallery.slice(1, 3).map((src, index) => (
                  <div key={`${src}-${index}`} className="overflow-hidden rounded-[2rem] bg-white/86 shadow-[0_20px_60px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                    <Image
                      src={src}
                      alt={`${offer.professional.name} портфолио ${index + 2}`}
                      width={800}
                      height={520}
                      sizes="(min-width: 1024px) 18rem, 100vw"
                      className="aspect-[16/10] h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-6 flex items-end justify-between gap-5">
              <div>
                <SectionEyebrow className="mb-4">Какво казват клиентите</SectionEyebrow>
                <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-on-surface">
                  Реални впечатления от подобни проекти
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <ReviewStars rating={Math.round(offer.professional.rating || 0)} />
                <span className="text-sm font-bold text-on-surface">
                  {offer.professional.rating.toFixed(1)} · {offer.professional.reviewCount} оценки
                </span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(reviews.length > 0 ? reviews : Array.from({ length: 3 }, (_, index) => ({
                id: `placeholder-${index}`,
                rating: Math.max(4, Math.round(offer.professional.rating || 5)),
                comment: index === 0
                  ? "Работата беше ясна, комуникацията спокойна, а резултатът — много по-силен от първоначалната идея."
                  : index === 1
                    ? "Получихме структурирани етапи и точен срок. Това беше ключово за доверието в процеса."
                    : "Най-силното тук беше спокойствието, с което проектът се движеше от бриф до финал.",
                createdAt: new Date(),
                reviewer: { name: index === 0 ? "Клиент на Atelier" : index === 1 ? "Мария Георгиева" : "Никола Петров" },
                project: { title: offer.request.title },
              }))).map((review) => (
                <div key={review.id} className="rounded-[2rem] bg-white/84 px-5 py-5 shadow-[0_18px_50px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                  <ReviewStars rating={review.rating} />
                  <p className="mt-4 text-sm leading-7 text-on-surface-variant">“{review.comment}”</p>
                  <div className="mt-5">
                    <p className="text-sm font-bold text-on-surface">{review.reviewer.name}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/70">
                      {review.project.title} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
