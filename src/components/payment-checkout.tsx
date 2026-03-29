"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import type { RequestDraft } from "@/lib/request-flow";

export type CheckoutOffer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  price: number;
  timeline: number;
  scope: string;
  warranty: string | null;
  revisions: string | null;
  professional: {
    id: string;
    name: string;
    avatarUrl: string | null;
    location: string | null;
    verified: boolean;
    rating: number;
    reviewCount: number;
  };
  request: {
    id: string;
    title: string;
    description: string;
    budget: string | null;
    timeline: string | null;
    location: string | null;
  };
  project: {
    id: string;
  } | null;
};

export type CheckoutPayment = {
  id: string;
  total: number;
  amount: number;
  serviceFee: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  invoiceNumber: string | null;
  project: {
    id: string;
    title: string;
    request: {
      title: string;
      description: string;
      budget: string | null;
      timeline: string | null;
      location: string | null;
    };
    professional: {
      id: string;
      name: string;
      avatarUrl: string | null;
      location: string | null;
      verified: boolean;
    };
  };
};

type ErrorResponse = { error?: string };

export type CheckoutState = {
  offer: CheckoutOffer | null;
  payment: CheckoutPayment | null;
};

type PaymentCheckoutProps = {
  offerId: string | null;
  paymentId: string | null;
  initialDraft: RequestDraft;
  initialState: CheckoutState;
  initialError?: string | null;
};

type CheckoutSummary = {
  title: string;
  description: string;
  budget: string;
  timeline: string;
  location: string;
  professionalName: string;
  professionalLocation: string;
  professionalVerified: boolean;
  professionalAvatar: string | null;
  amount: number;
  serviceFee: number;
  total: number;
  currency: string;
  scope: string;
  revisions: string | null;
  warranty: string | null;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = await readJson<ErrorResponse>(response);
  return payload?.error ?? fallback;
}

function formatCurrency(value: number, currency = "BGN") {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPaymentSummary(payment: CheckoutPayment, draft: RequestDraft): CheckoutSummary {
  return {
    title: payment.project.title,
    description: payment.project.request.description,
    budget: payment.project.request.budget ?? draft.budget,
    timeline: payment.project.request.timeline ?? draft.timeline,
    location: payment.project.request.location ?? draft.city,
    professionalName: payment.project.professional.name,
    professionalLocation: payment.project.professional.location ?? "Локация по заявката",
    professionalVerified: payment.project.professional.verified,
    professionalAvatar: payment.project.professional.avatarUrl,
    amount: payment.amount,
    serviceFee: payment.serviceFee,
    total: payment.total,
    currency: payment.currency,
    scope: "Плащането покрива договорения обхват и старта на проекта през защитения workflow на Atelier.",
    revisions: null,
    warranty: payment.invoiceNumber ? `Фактура ${payment.invoiceNumber}` : null,
  };
}

function buildOfferSummary(offer: CheckoutOffer, draft: RequestDraft): CheckoutSummary {
  return {
    title: offer.request.title,
    description: offer.request.description,
    budget: offer.request.budget ?? draft.budget,
    timeline: offer.request.timeline ?? draft.timeline,
    location: offer.request.location ?? draft.city,
    professionalName: offer.professional.name,
    professionalLocation: offer.professional.location ?? "Локация по заявката",
    professionalVerified: offer.professional.verified,
    professionalAvatar: offer.professional.avatarUrl,
    amount: offer.price,
    serviceFee: 45,
    total: offer.price + 45,
    currency: "BGN",
    scope: offer.scope,
    revisions: offer.revisions,
    warranty: offer.warranty,
  };
}

function getTrustRows(state: CheckoutState) {
  const rating = state.offer?.professional.rating ?? 4.9;
  const reviews = state.offer?.professional.reviewCount ?? 0;

  return [
    {
      icon: "verified_user",
      title: "Проверен професионалист",
      description:
        state.offer?.professional.verified || state.payment?.project.professional.verified
          ? "Профилът е с активна верификация и публична история на работа през Atelier."
          : "Плащането остава защитено, докато потвърдиш резултата и следващата стъпка по проекта.",
    },
    {
      icon: "shield_lock",
      title: "Плащане със защита",
      description:
        "Средствата минават през защитен checkout. Освобождаваме ги само след ясен статус и потвърждение от твоя страна.",
    },
    {
      icon: "star",
      title: "Репутация и оценки",
      description: `Средна оценка ${rating.toFixed(1)} от ${reviews} клиентски ревюта и активни проекти.`,
    },
  ];
}

export function PaymentCheckout({
  offerId,
  paymentId,
  initialDraft,
  initialState,
  initialError = null,
}: PaymentCheckoutProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError);
  const [submitting, setSubmitting] = useState(false);

  const summary =
    initialState.payment
      ? buildPaymentSummary(initialState.payment, initialDraft)
      : initialState.offer
        ? buildOfferSummary(initialState.offer, initialDraft)
        : null;

  const trustRows = getTrustRows(initialState);
  const backParams = new URLSearchParams({
    query: summary?.title ?? initialDraft.query,
  });

  if (summary?.location) {
    backParams.set("city", summary.location);
  }

  if (summary?.budget) {
    backParams.set("budget", summary.budget);
  }

  if (summary?.timeline) {
    backParams.set("timeline", summary.timeline);
  }

  const backHref = `/offers/compare?${backParams.toString()}`;

  const handleCheckout = async () => {
    if (paymentId && initialState.payment?.status === "COMPLETED") {
      router.push(`/payment/success?paymentId=${paymentId}`);
      return;
    }

    if (!offerId) {
      setError("Липсва избрана оферта за плащане.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (initialState.offer?.status === "PENDING") {
        const acceptResponse = await fetch(`/api/offers/${offerId}/accept`, {
          method: "POST",
        });

        if (!acceptResponse.ok) {
          throw new Error(await readErrorMessage(acceptResponse, "Не успяхме да приемем офертата."));
        }
      }

      const sessionResponse = await fetch("/api/payments/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error(await readErrorMessage(sessionResponse, "Не успяхме да подготвим checkout сесията."));
      }

      const payload = await readJson<{
        checkoutUrl?: string | null;
        payment?: { id: string };
      }>(sessionResponse);

      if (payload?.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (payload?.payment?.id) {
        router.push(`/payment/success?paymentId=${payload.payment.id}`);
        return;
      }

      throw new Error("Checkout сесията не върна валиден отговор.");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Не успяхме да стартираме защитеното плащане.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Защитено плащане</SectionEyebrow>
              <h1 className="text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.4rem]">
                Потвърди избраната оферта, без да губиш усещането за сигурност.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Това е последната спокойна стъпка преди старт на проекта. Виж детайлите,
                провери професионалиста и продължи към защитения checkout през Stripe.
              </p>
            </EditorialPanel>

            <EditorialPanel className="p-6 md:p-8">
              <SectionEyebrow className="mb-4">Какво получаваш</SectionEyebrow>
              <div className="space-y-4">
                {trustRows.map((item) => (
                  <div key={item.title} className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span
                          aria-hidden="true"
                          className="material-symbols-outlined text-[22px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {item.icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.title}</p>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </EditorialPanel>
          </div>

          {error ? (
            <EditorialPanel className="p-5 text-sm text-error" role="alert" aria-live="polite">
              {error}
            </EditorialPanel>
          ) : null}

          {!summary ? (
            <EditorialPanel className="p-8 text-center text-sm text-on-surface-variant">
              Не открихме оферта или плащане за този екран.
            </EditorialPanel>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Избраният професионалист</SectionEyebrow>
                <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                  <div className="overflow-hidden rounded-[2.2rem] bg-surface-container-low">
                    {summary.professionalAvatar ? (
                      <Image
                        src={summary.professionalAvatar}
                        alt={summary.professionalName}
                        width={560}
                        height={560}
                        sizes="(min-width: 768px) 22rem, 100vw"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,rgba(218,188,228,0.75),rgba(202,214,253,0.55),rgba(255,255,255,0.92))] text-center">
                        <div className="space-y-3 px-6">
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-primary shadow-[0_16px_34px_rgba(77,66,96,0.08)]">
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-[26px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          </span>
                          <p className="text-sm font-semibold text-on-surface-variant">Проверен профил в Atelier</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary/70">Водещ професионалист</p>
                      <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] text-on-surface">{summary.professionalName}</h2>
                      <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                        {summary.professionalLocation}
                        {summary.professionalVerified ? " • проверен профил" : " • профил в процес на верификация"}
                      </p>
                    </div>

                    <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Твоят проект</p>
                      <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">{summary.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-on-surface-variant">{summary.description}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[summary.location, summary.budget, summary.timeline].map((item, index) => (
                        <div key={`${item}-${index}`} className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Резюме на офертата</SectionEyebrow>
                <div className="space-y-5">
                  <div className="rounded-[1.9rem] bg-surface-container-low px-5 py-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">Обхват и договорка</p>
                    <p className="mt-3 text-sm leading-7 text-on-surface-variant">{summary.scope}</p>
                    {(summary.revisions || summary.warranty) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {summary.revisions ? (
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)]">
                            {summary.revisions}
                          </span>
                        ) : null}
                        {summary.warranty ? (
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-on-surface shadow-[0_12px_24px_rgba(77,66,96,0.06)]">
                            {summary.warranty}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-[1.9rem] bg-[linear-gradient(180deg,rgba(110,86,120,0.13),rgba(110,86,120,0.05))] px-5 py-5">
                    <div className="flex items-center justify-between text-sm text-on-surface-variant">
                      <span>Договорена сума</span>
                      <span className="font-semibold text-on-surface">{formatCurrency(summary.amount, summary.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-on-surface-variant">
                      <span>Сервизна защита</span>
                      <span className="font-semibold text-on-surface">{formatCurrency(summary.serviceFee, summary.currency)}</span>
                    </div>
                    <div className="soft-divider" />
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-on-surface">Общо</span>
                      <span className="text-3xl font-extrabold tracking-tight text-on-surface">{formatCurrency(summary.total, summary.currency)}</span>
                    </div>
                  </div>

                  <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-sm leading-7 text-on-surface-variant">
                    Ще бъдеш пренасочен към Stripe Checkout. Ако вече имаш активна сесия, ще те върнем директно към нея без да губиш контекст.
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCheckout()}
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting
                        ? "Подготвяме checkout..."
                        : paymentId && initialState.payment?.status === "COMPLETED"
                          ? "Към потвърждението"
                          : "Продължи към защитено плащане"}
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">
                        arrow_forward
                      </span>
                    </button>
                    <Link
                      href={offerId ? backHref : "/dashboard"}
                      className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                    >
                      Назад към избора
                    </Link>
                  </div>
                </div>
              </EditorialPanel>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
