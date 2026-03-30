"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";

type RequestResponse = {
  request?: {
    id: string;
    title: string;
    description: string;
    budget: string | null;
    timeline: string | null;
    location: string | null;
    area: string | null;
    offers: Array<{
      id: string;
      price: number;
      timeline: number;
      professional: {
        name: string;
      };
    }>;
    client: {
      name: string;
      avatarUrl: string | null;
    };
    attachments: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileType: string | null;
    }>;
  };
  error?: string;
};

type SuggestionResponse = {
  suggestion?: {
    minPrice?: number;
    maxPrice?: number;
    recommendedPrice?: number;
    timelineDays?: number;
    rationale?: string;
  };
  error?: string;
};

type OfferResponse = {
  offer?: {
    id: string;
    requestId: string;
  };
  error?: string;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function takeFirst(value: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function CreateOfferExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId =
    takeFirst(searchParams.get("request")) ?? takeFirst(searchParams.get("requestId"));

  const [requestState, setRequestState] =
    useState<RequestResponse["request"] | null>(null);
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [scope, setScope] = useState("");
  const [warranty, setWarranty] = useState("");
  const [revisions, setRevisions] = useState("");
  const [quote, setQuote] = useState("");
  const [featured, setFeatured] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(requestId));
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRequest() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/requests/${requestId}`, {
          cache: "no-store",
        });
        const payload = await readJson<RequestResponse>(response);

        if (response.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(`/pro/offers/create?request=${requestId}`)}`);
          return;
        }

        const requestData = payload?.request;

        if (!response.ok || !requestData) {
          throw new Error(payload?.error ?? "Не успяхме да заредим брифа.");
        }

        if (cancelled) {
          return;
        }

        setRequestState(requestData);
        setScope((current) =>
          current || `Ще структурирам изпълнението около: ${requestData.description}`,
        );
        setQuote((current) =>
          current ||
          "Ще подготвя ясен план, комуникация по етапи и спокойна доставка без излишен шум.",
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не успяхме да заредим брифа.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRequest();

    return () => {
      cancelled = true;
    };
  }, [requestId, router]);

  const attachmentCards = useMemo(() => {
    return requestState?.attachments ?? [];
  }, [requestState]);

  async function handleSuggestPrice() {
    if (!requestState || isSuggesting) {
      return;
    }

    setIsSuggesting(true);
    setError(null);
    setAiNote(null);

    try {
      const response = await fetch("/api/ai/suggest-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: requestState.area ?? requestState.title,
          area: requestState.area ?? undefined,
          location: requestState.location ?? undefined,
          scope: requestState.description,
          similarOffers: requestState.offers.map((offer) => ({
            price: offer.price,
            timeline: offer.timeline,
          })),
        }),
      });
      const payload = await readJson<SuggestionResponse>(response);

      if (!response.ok || !payload?.suggestion) {
        throw new Error(payload?.error ?? "Не успяхме да получим AI ориентир.");
      }

      const recommendation = payload.suggestion.recommendedPrice;
      if (recommendation) {
        setPrice(String(Math.round(recommendation)));
      }
      if (payload.suggestion.timelineDays) {
        setTimeline(String(payload.suggestion.timelineDays));
      }

      const range =
        payload.suggestion.minPrice && payload.suggestion.maxPrice
          ? `${formatCurrency(payload.suggestion.minPrice)} – ${formatCurrency(payload.suggestion.maxPrice)}`
          : null;

      setAiNote(
        [
          range ? `AI ориентир: ${range}` : null,
          payload.suggestion.rationale ?? null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (suggestError) {
      setError(
        suggestError instanceof Error
          ? suggestError.message
          : "Не успяхме да получим AI ориентир.",
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestId || !requestState || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          price: Number(price),
          timeline: Number(timeline),
          scope,
          warranty: warranty.trim() || undefined,
          revisions: revisions.trim() || undefined,
          quote: quote.trim() || undefined,
          featured,
          termsAccepted,
        }),
      });
      const payload = await readJson<OfferResponse>(response);

      if (!response.ok || !payload?.offer) {
        throw new Error(payload?.error ?? "Не успяхме да изпратим офертата.");
      }

      setSuccess("Офертата е изпратена и вече е част от живия поток на заявката.");
      router.push("/pro/dashboard?offerSent=1");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да изпратим офертата.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-28 md:pt-36">
        <header className="text-center">
          <SectionEyebrow className="mb-5">Предложение за проект</SectionEyebrow>
          <h1 className="text-[2.7rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-on-surface md:text-[4.4rem]">
            Изготвяне на оферта: Atelier
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-on-surface-variant md:text-lg">
            Персонализирано предложение за интериорен дизайн, визуализации и премиум реализация.
          </p>
        </header>

        {!requestId ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] bg-white/82 px-8 py-10 text-center shadow-[0_30px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">
              Липсва избрана заявка
            </h2>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Отвори създаването на оферта от подбраната заявка, за да заредим правилния контекст.
            </p>
            <Link
              href="/pro/dashboard"
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
            >
              Към таблото за професионалиста
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <section className="space-y-5">
              <div className="rounded-[2.15rem] bg-white/84 p-5 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                {isLoading ? (
                  <p className="text-sm leading-7 text-on-surface-variant">Зареждаме реалната заявка...</p>
                ) : requestState ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-surface-container-low">
                        {requestState.client.avatarUrl ? (
                          <Image
                            src={requestState.client.avatarUrl}
                            alt={requestState.client.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary">
                            {requestState.client.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{requestState.client.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-on-surface-variant/60">Клиентски бриф</p>
                      </div>
                    </div>

                    <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-on-surface">
                      {requestState.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                      {requestState.description}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[requestState.location ?? "По уточнение", requestState.budget ?? "Не е посочен", requestState.timeline ?? "По договаряне", `${requestState.offers.length} оферти досега`].map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                          {item}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              <div className="rounded-[2.15rem] bg-white/84 p-5 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/70">
                      AI анализ на заявката
                    </p>
                    <h3 className="mt-3 text-lg font-extrabold tracking-tight text-on-surface">
                      AI ориентир за цена и срок
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleSuggestPrice}
                    disabled={!requestState || isSuggesting}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSuggesting ? "Мислим..." : "AI цена"}
                  </button>
                </div>
                <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                  AI сравнява обхвата, локацията и вече наличните оферти, за да ти даде ориентир за цена и срок.
                </p>
                <div className="mt-5 rounded-[1.6rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                  {aiNote ?? "На този етап AI ти подсказва само диапазон и аргументация. Финалната оферта остава твое професионално решение."}
                </div>
              </div>

              {attachmentCards.length > 0 ? (
                <div className="rounded-[2.15rem] bg-white/84 p-5 shadow-[0_24px_70px_rgba(77,66,96,0.08)] backdrop-blur-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Прикачени файлове
                  </p>
                  <div className="mt-4 space-y-3">
                    {attachmentCards.map((item) => (
                      <a
                        key={item.id}
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface transition-colors hover:bg-white"
                      >
                        <span className="font-medium">{item.fileName}</span>
                        <span className="text-on-surface-variant">{item.fileType ?? "файл"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[2.35rem] bg-white/88 p-7 shadow-[0_32px_90px_rgba(77,66,96,0.1)] backdrop-blur-xl md:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                Вашето предложение
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">
                Подредено предложение, което вдъхва доверие.
              </h2>

              {error ? (
                <div className="mt-6 rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-6 rounded-[1.6rem] bg-primary/8 px-5 py-4 text-sm font-medium text-primary">
                  {success}
                </div>
              ) : null}

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Цена (лв.)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="напр. 2 400"
                      required
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Срок
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={timeline}
                      onChange={(event) => setTimeline(event.target.value)}
                      placeholder="напр. 10 работни дни"
                      required
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Описание и изпълнение
                  </label>
                  <textarea
                    rows={6}
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                    placeholder="Опишете етапите на изпълнение..."
                    required
                    className="w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface outline-none shadow-[inset_0_-1px_0_rgba(124,117,125,0.22)] transition-[background-color,box-shadow] duration-200 placeholder:text-on-surface-variant/50 focus:bg-white focus:shadow-[inset_0_-2px_0_var(--color-primary),0_18px_36px_rgba(77,66,96,0.08)]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Гаранция / последваща грижа
                  </label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(event) => setWarranty(event.target.value)}
                    placeholder="Напр. безплатни ревизии"
                    className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                    Кратка бележка
                  </label>
                  <textarea
                    rows={4}
                    value={quote}
                    onChange={(event) => setQuote(event.target.value)}
                    placeholder="Създаваме връзка с атмосферата на Atelier и ясно заявяваме професионалния подход."
                    className="w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-4 text-sm leading-7 text-on-surface outline-none shadow-[inset_0_-1px_0_rgba(124,117,125,0.22)] transition-[background-color,box-shadow] duration-200 placeholder:text-on-surface-variant/50 focus:bg-white focus:shadow-[inset_0_-2px_0_var(--color-primary),0_18px_36px_rgba(77,66,96,0.08)]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                      Ревизии
                    </label>
                    <input
                      type="text"
                      value={revisions}
                      onChange={(event) => setRevisions(event.target.value)}
                      placeholder="Напр. 2 кръга ревизии"
                      className="w-full rounded-t-[1.4rem] border-b-4 border-primary/25 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-colors focus:border-primary"
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-[1.8rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={() => setFeatured((current) => !current)}
                      className="mt-1 h-5 w-5 rounded border-outline-variant bg-surface-container-low text-primary"
                    />
                    Маркирай офертата като силно съвпадение, ако заявката е наистина в твоята специализация.
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-[1.8rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted((current) => !current)}
                    className="mt-1 h-5 w-5 rounded border-outline-variant bg-surface-container-low text-primary"
                    required
                  />
                  Потвърждавам, че срокът, цената и обхватът са реалистични и че ще комуникирам спокойно и прозрачно през Atelier.
                </label>

                <button
                  type="submit"
                  disabled={!requestState || isSubmitting || !termsAccepted}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Изпращаме офертата..." : "Изпрати оферта"}
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </button>
              </form>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function CreateOfferPage() {
  return (
    <Suspense fallback={null}>
      <CreateOfferExperience />
    </Suspense>
  );
}

