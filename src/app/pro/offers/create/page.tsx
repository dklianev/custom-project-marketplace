"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
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
          range ? `AI range: ${range}` : null,
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
    <div className="min-h-screen bg-background text-on-surface">
      <Navbar />

      <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-32">
        <header className="text-center">
          <SectionEyebrow className="mb-4">Съставяне на оферта</SectionEyebrow>
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            Изпрати спокойна, доверена оферта.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
            Тук вече работим с реална заявка, AI ориентир за цена и реално
            изпращане към системата за оферти.
          </p>
        </header>

        {!requestId ? (
          <EditorialPanel className="mx-auto mt-10 max-w-3xl p-8">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Липсва избрана заявка
            </h2>
            <p className="mt-4 text-sm leading-7 text-on-surface-variant">
              Отвори създаването на оферта от подбраната заявка, за да заредим
              правилния контекст.
            </p>
            <Link
              href="/pro/dashboard"
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
            >
              Към таблото за професионалиста
            </Link>
          </EditorialPanel>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            <section className="space-y-6 lg:col-span-5 lg:sticky lg:top-32">
              <EditorialPanel className="p-6">
                {isLoading ? (
                  <p className="text-sm leading-7 text-on-surface-variant">
                    Зареждаме реалната заявка...
                  </p>
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
                        <p className="text-base font-bold text-on-surface">
                          {requestState.client.name}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          Контекст на заявката
                        </p>
                      </div>
                    </div>

                    <h2 className="mt-6 text-2xl font-extrabold tracking-tight">
                      {requestState.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                      {requestState.description}
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                          Локация
                        </p>
                        <p className="mt-2 font-bold text-on-surface">
                          {requestState.location ?? "По уточнение"}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                          Бюджет
                        </p>
                        <p className="mt-2 font-bold text-on-surface">
                          {requestState.budget ?? "Не е посочен"}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                          Срок
                        </p>
                        <p className="mt-2 font-bold text-on-surface">
                          {requestState.timeline ?? "По договаряне"}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                          Оферти досега
                        </p>
                        <p className="mt-2 font-bold text-on-surface">
                          {requestState.offers.length}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </EditorialPanel>

              <EditorialPanel className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                      AI ориентир за цена
                    </p>
                    <h3 className="mt-3 text-xl font-extrabold tracking-tight">
                      Ползвай AI ориентир, после прецени сам.
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
                  AI сравнява обхвата, локацията и вече наличните оферти, за да ти даде
                  ориентир за цена и срок.
                </p>

                {aiNote ? (
                  <div className="mt-5 rounded-[1.6rem] bg-primary/8 px-5 py-5 text-sm leading-7 text-primary">
                    {aiNote}
                  </div>
                ) : null}
              </EditorialPanel>

              {attachmentCards.length > 0 ? (
                <EditorialPanel className="p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                      Прикачени файлове
                  </p>
                  <div className="mt-4 space-y-3">
                    {attachmentCards.map((item) => (
                      <a
                        key={item.id}
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[1.3rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface transition-colors hover:bg-white"
                      >
                        <span className="font-medium">{item.fileName}</span>
                        <span className="text-on-surface-variant">
                          {item.fileType ?? "файл"}
                        </span>
                      </a>
                    ))}
                  </div>
                </EditorialPanel>
              ) : null}
            </section>

            <section className="lg:col-span-7">
              <EditorialPanel className="p-8 lg:p-10">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                      Офертата ти
                  </p>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Изпрати оферта, която вдъхва доверие.
                  </h2>
                </div>

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
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-on-surface">
                        Цена (лв.)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="Напр. 3200"
                        required
                        className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-on-surface">
                        Срок (дни)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={timeline}
                        onChange={(event) => setTimeline(event.target.value)}
                        placeholder="Напр. 14"
                        required
                        className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-on-surface">
                      Обхват и подход
                    </label>
                    <textarea
                      rows={6}
                      value={scope}
                      onChange={(event) => setScope(event.target.value)}
                      placeholder="Опиши етапите, резултатите и как ще водиш процеса."
                      required
                      className="w-full resize-none rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-sm leading-relaxed text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-on-surface">
                        Ревизии
                      </label>
                      <input
                        type="text"
                        value={revisions}
                        onChange={(event) => setRevisions(event.target.value)}
                        placeholder="Напр. 2 кръга ревизии"
                        className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-on-surface">
                        Гаранция / последваща грижа
                      </label>
                      <input
                        type="text"
                        value={warranty}
                        onChange={(event) => setWarranty(event.target.value)}
                        placeholder="Напр. 30 дни последваща грижа"
                        className="w-full rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-on-surface">
                      Кратка офертна бележка
                    </label>
                    <textarea
                      rows={4}
                      value={quote}
                      onChange={(event) => setQuote(event.target.value)}
                      placeholder="Кажи защо твоят подход е подходящ точно за тази заявка."
                      className="w-full resize-none rounded-t-[1.25rem] border-b-4 border-primary/30 bg-surface-container-low px-5 py-4 text-sm leading-relaxed text-on-surface placeholder:text-outline focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-4 rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={() => setFeatured((current) => !current)}
                        className="mt-1 h-5 w-5 rounded border-outline-variant bg-surface-container-low text-primary"
                      />
                      <span className="text-sm leading-7 text-on-surface-variant">
                        Маркирай офертата като най-подходящ избор, ако заявката наистина
                        съвпада с твоята специализация.
                      </span>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={() => setTermsAccepted((current) => !current)}
                        className="mt-1 h-5 w-5 rounded border-outline-variant bg-surface-container-low text-primary"
                        required
                      />
                      <span className="text-sm leading-7 text-on-surface-variant">
                        Потвърждавам, че срокът, цената и обхватът са реалистични и
                        че ще комуникирам спокойно и прозрачно през Atelier.
                      </span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!requestState || isSubmitting || !termsAccepted}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-4 text-base font-bold tracking-tight text-on-primary transition-[transform,opacity,box-shadow] duration-300 hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-xl"
                      >
                        send
                      </span>
                      {isSubmitting ? "Изпращаме офертата..." : "Изпрати офертата"}
                    </button>
                  </div>
                </form>
              </EditorialPanel>

              <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-outline">
                Цената и обхватът ти вече отиват към реалната заявка, не към
                демонстрационен екран.
              </p>
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
