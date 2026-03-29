import { Fragment } from "react";
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

type MatrixRow = {
  key: string;
  label: string;
};

const matrixRows: MatrixRow[] = [
  { key: "fit", label: "Съвпадение със заявката" },
  { key: "verification", label: "Ниво на доверие" },
  { key: "specialty", label: "Релевантен опит" },
  { key: "scope", label: "Подход и обхват" },
  { key: "price", label: "Цена" },
  { key: "timeline", label: "Срок" },
  { key: "revisions", label: "Ревизии" },
  { key: "warranty", label: "Гаранция" },
  { key: "payment", label: "Плащане със защита" },
  { key: "reviews", label: "Ревюта" },
  { key: "response", label: "Сигнал за надеждност" },
];

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

  if (offer.featured) {
    score += 9;
  }
  if (offer.professional.verified) {
    score += 6;
  }
  score += Math.min(Math.round(offer.professional.rating * 2), 10);
  score += Math.min(Math.floor(offer.professional.reviewCount / 40), 6);

  if (request.location && offer.professional.location === request.location) {
    score += 4;
  }

  if ((offer.professional.skills?.length ?? 0) >= 3) {
    score += 3;
  }

  return Math.min(score, 98);
}

function buildBadge(offer: RequestOffer, offers: RequestOffer[], index: number) {
  const lowestPrice = Math.min(...offers.map((item) => item.price));
  const fastestTimeline = Math.min(...offers.map((item) => item.timeline));

  if (index === 0) {
    return offer.featured ? "AI водещ избор" : "Най-силно съвпадение";
  }
  if (offer.price === lowestPrice) {
    return "Най-добра стойност";
  }
  if (offer.timeline === fastestTimeline) {
    return "Най-бърз срок";
  }
  return "Силен алтернативен избор";
}

function buildVerificationCopy(offer: RequestOffer) {
  return offer.professional.verified
    ? "Проверен професионалист"
    : "Профил без завършена верификация";
}

function buildSpecialtyCopy(offer: RequestOffer) {
  if (offer.professional.skills.length > 0) {
    return offer.professional.skills.slice(0, 3).join(" · ");
  }

  return "Подходящ опит за този проект";
}

function buildResponseCopy(offer: RequestOffer) {
  if (offer.professional.reviewCount >= 200) {
    return "Утвърден профил с много клиентски цикли";
  }
  if (offer.professional.reviewCount >= 80) {
    return "Стабилен профил с доказан рейтинг";
  }
  return "По-нов профил, но с добри ранни сигнали";
}

function buildReason(offer: RequestOffer, request: AccessibleRequest) {
  const skills = offer.professional.skills.slice(0, 2).join(" и ");
  const locationMatch =
    request.location && offer.professional.location === request.location
      ? "Локацията съвпада с проекта и това намалява риска от забавяне."
      : "Подходът е релевантен, дори без силен локален сигнал.";

  if (offer.quote?.trim()) {
    return offer.quote.trim();
  }

  return `${offer.professional.name} влиза силно в тази заявка с ${skills || "релевантен опит"}. ${locationMatch}`;
}

function buildMatrixValue(offer: RequestOffer, request: AccessibleRequest, key: string) {
  switch (key) {
    case "fit":
      return `${computeFitScore(offer, request)}/100`;
    case "verification":
      return buildVerificationCopy(offer);
    case "specialty":
      return buildSpecialtyCopy(offer);
    case "scope":
      return offer.scope;
    case "price":
      return formatCurrency(offer.price);
    case "timeline":
      return `${offer.timeline} дни`;
    case "revisions":
      return offer.revisions?.trim() || "Уточняват се в чата";
    case "warranty":
      return offer.warranty?.trim() || "По договаряне";
    case "payment":
      return request.project?.offerId === offer.id
        ? "Има активен project flow"
        : "Плащане през защитен checkout на Atelier";
    case "reviews":
      return `${offer.professional.rating.toFixed(1)} · ${offer.professional.reviewCount} ревюта`;
    case "response":
      return buildResponseCopy(offer);
    default:
      return "-";
  }
}

function getOfferProjectId(request: AccessibleRequest, offer: RequestOffer) {
  return request.project?.offerId === offer.id ? request.project.id : null;
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
            <SectionEyebrow className="mb-4">Decision room</SectionEyebrow>
            <h1 className="text-[2.4rem] font-extrabold tracking-[-0.06em] md:text-[4rem]">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
              {description}
            </p>
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
        title="Липсва избрана заявка за сравнение."
        description="Страницата за сравнение вече работи само с реални оферти по конкретна заявка. Отвори я от dashboard-а или от клиентския flow след като получиш оферти."
        href="/dashboard"
        cta="Към dashboard"
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
        : "Не успяхме да заредим реалните оферти за тази заявка.";
  }

  if (!request) {
    return (
      <CompareEmptyState
        title="Нямаш достъп до това пространство за избор."
        description={loadError ?? "Не успяхме да заредим реалните оферти за тази заявка."}
        href="/dashboard"
        cta="Назад към dashboard"
      />
    );
  }

  const offers = request.offers
    .filter((offer) => offer.status === "PENDING" || offer.status === "ACCEPTED")
    .sort((left, right) => {
      const leftScore = computeFitScore(left, request);
      const rightScore = computeFitScore(right, request);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return left.price - right.price;
    });
  const contextQuery = buildContextQuery(request);

  if (offers.length === 0) {
    return (
      <CompareEmptyState
        title="Все още няма оферти за тази заявка."
        description="Когато проверен професионалист изпрати оферта, ще я покажем тук като реална таблица за избор, а не като декоративни карти."
        href="/dashboard"
        cta="Назад към заявките"
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <SectionEyebrow className="mb-5">Decision room</SectionEyebrow>
            <h1 className="text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.8rem]">
              Сравни реалните оферти по тази заявка спокойно и без шум.
            </h1>
            <p className="mt-6 text-base leading-8 text-on-surface-variant md:text-lg">
              Това вече не е шоурум. Виждаш истинските оферти, подредени по съвпадение, доверие и риск за изпълнение, за да вземеш решение уверено.
            </p>
          </div>

          <EditorialPanel className="mt-10 p-6 md:p-8">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Твоята заявка</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">{request.title}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-on-surface-variant md:text-base">
                  {request.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-sm text-on-surface-variant">
                  {[request.location, request.budget, request.timeline, request.area]
                    .filter(Boolean)
                    .map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-surface-container-low px-4 py-2 font-semibold text-on-surface"
                      >
                        {item}
                      </span>
                    ))}
                </div>
              </div>

              <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Какво виждаш тук
                </p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  AI подреди {offers.length} реални оферти по сигнали за съвпадение, рейтинг, верификация и релевантност към заявката. Това е обвързано със заявката пространство за сравнение, не общ каталог.
                </p>
              </div>
            </div>
          </EditorialPanel>

          <div className="mt-8 overflow-hidden rounded-[2.4rem] border border-white/70 bg-white/72 shadow-[0_34px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl">
            <div className="overflow-x-auto">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `220px repeat(${offers.length}, minmax(260px, 1fr))`,
                  minWidth: `${220 + offers.length * 260}px`,
                }}
              >
                <div className="border-b border-white/70 px-6 py-7">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Критерии за избор
                  </p>
                </div>

                {offers.map((offer, index) => {
                  const featured = index === 0;
                  const badge = buildBadge(offer, offers, index);
                  const primaryHref = `/offers/${offer.id}?${contextQuery}`;
                  const projectId = getOfferProjectId(request, offer);
                  const secondaryHref = projectId
                    ? `/project/${projectId}`
                    : `${primaryHref}#decision`;

                  return (
                    <div
                      key={offer.id}
                      className={featured ? "border-b border-white/70 bg-[linear-gradient(180deg,rgba(110,86,120,0.13),rgba(110,86,120,0.04))] px-6 py-7" : "border-b border-white/70 px-6 py-7"}
                    >
                      <div className="flex h-full flex-col justify-between gap-5">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <span className={featured ? "rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-on-primary" : "rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80"}>
                              {badge}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">
                              {buildVerificationCopy(offer)}
                            </span>
                          </div>
                          <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{offer.professional.name}</h2>
                          <p className="mt-2 text-sm leading-7 text-on-surface-variant">{buildSpecialtyCopy(offer)}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                            {buildReason(offer, request)}
                          </div>
                          <div className="flex gap-3">
                            <Link
                              href={primaryHref}
                              className={featured ? "inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-black text-on-primary transition-opacity hover:opacity-95" : "inline-flex items-center justify-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"}
                            >
                              Виж офертата
                            </Link>
                            <Link
                              href={secondaryHref}
                              className="inline-flex items-center justify-center rounded-full bg-white/85 px-5 py-3 text-sm font-bold text-on-surface shadow-[0_14px_28px_rgba(77,66,96,0.08)] transition-colors hover:bg-white"
                            >
                              {projectId ? "Отвори проекта" : "Приеми офертата"}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {matrixRows.map((row, rowIndex) => (
                  <Fragment key={row.key}>
                    <div className={rowIndex === matrixRows.length - 1 ? "px-6 py-5" : "border-b border-white/55 px-6 py-5"}>
                      <p className="text-sm font-bold text-on-surface">{row.label}</p>
                    </div>
                    {offers.map((offer, offerIndex) => {
                      const featured = offerIndex === 0;
                      return (
                        <div
                          key={`${row.key}-${offer.id}`}
                          className={rowIndex === matrixRows.length - 1 ? (featured ? "bg-[linear-gradient(180deg,rgba(110,86,120,0.13),rgba(110,86,120,0.04))] px-6 py-5" : "px-6 py-5") : (featured ? "border-b border-white/55 bg-[linear-gradient(180deg,rgba(110,86,120,0.13),rgba(110,86,120,0.04))] px-6 py-5" : "border-b border-white/55 px-6 py-5")}
                        >
                          <p className="text-sm leading-7 text-on-surface-variant">
                            {buildMatrixValue(offer, request, row.key)}
                          </p>
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {offers.map((offer) => (
              <EditorialPanel key={offer.id} className="p-6">
                <SectionEyebrow className="mb-4">Защо AI го позиционира тук</SectionEyebrow>
                <h2 className="text-2xl font-extrabold tracking-tight">{offer.professional.name}</h2>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">{buildReason(offer, request)}</p>
              </EditorialPanel>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Какво следва след избора</SectionEyebrow>
              <div className="space-y-5">
                {[
                  "Избираш оферта и минаваш през защитения payment / booking flow.",
                  "Чатът, milestones и статусите се отключват в trust-first project среда.",
                  "След финалното предаване оставяш реално ревю по завършения проект.",
                ].map((item, index) => (
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
              <SectionEyebrow className="mb-4">Ако още се колебаеш</SectionEyebrow>
              <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
                Върни заявката за още уточнение или отвори най-силното съвпадение.
              </h2>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                Можеш да прецизираш заявката, ако искаш по-строго бюджетно или стилово съвпадение, или да отвориш най-силната оферта и да видиш доверието в детайл.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/request/create?${contextQuery}`}
                  className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  Прецизирай заявката
                </Link>
                <Link
                  href={`/offers/${offers[0].id}?${contextQuery}`}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
                >
                  Отвори топ match
                </Link>
              </div>
            </EditorialPanel>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
