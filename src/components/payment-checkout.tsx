"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
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
    scope: "Плащането покрива договорения обхват, старта на проекта и защитения работен поток на Atelier.",
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
        body: JSON.stringify({ offerId }),
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

      <main className="flex-1 px-6 pb-20 pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center justify-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/72 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-on-surface-variant shadow-[0_10px_24px_rgba(77,66,96,0.05)]">
              <span aria-hidden="true" className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                lock
              </span>
              Сигурно плащане
            </span>
          </div>

          {!summary ? (
            <div className="rounded-[2.25rem] bg-white/82 px-8 py-10 text-center shadow-[0_30px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl">
              <p className="text-sm leading-7 text-on-surface-variant">
                {error ?? "Не открихме оферта или плащане за този екран."}
              </p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.02fr_0.88fr] lg:items-start">
              <section className="space-y-6">
                <div>
                  <h1 className="text-[2.6rem] font-extrabold leading-[1.06] tracking-[-0.06em] text-on-surface md:text-[4.2rem]">
                    Завършете Вашата резервация
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-on-surface-variant">
                    Прегледайте детайлите на Вашето предложение преди плащане.
                  </p>
                </div>

                <div className="rounded-[2.25rem] bg-white/82 p-5 shadow-[0_30px_90px_rgba(77,66,96,0.08)] backdrop-blur-xl md:p-6">
                  <div className="grid gap-5 md:grid-cols-[132px_1fr] md:items-center">
                    <div className="overflow-hidden rounded-[1.6rem] bg-surface-container-low">
                      <Image
                        src={summary.professionalAvatar ?? "/editorial/project-concept.svg"}
                        alt={summary.professionalName}
                        width={320}
                        height={320}
                        sizes="132px"
                        className="aspect-square h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                        Премиум пакет
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-on-surface">
                        {summary.title}
                      </h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Дата</p>
                          <p className="mt-2 text-sm font-semibold text-on-surface">{summary.location}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Времетраене</p>
                          <p className="mt-2 text-sm font-semibold text-on-surface">{summary.timeline}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">Профил</p>
                          <p className="mt-2 text-sm font-semibold text-on-surface">{summary.professionalName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.9rem] bg-white/76 px-5 py-5 shadow-[0_18px_48px_rgba(77,66,96,0.06)] backdrop-blur-xl">
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified_user
                      </span>
                    </span>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Гарантирана сигурност</p>
                      <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                        Вашите финанси са криптирани през Stripe. Средствата остават в защитения поток на Atelier до следващия ясен етап по проекта.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2.3rem] bg-white/88 p-6 shadow-[0_32px_90px_rgba(77,66,96,0.1)] backdrop-blur-xl md:p-7">
                <p className="text-sm font-semibold text-on-surface">Метод на плащане</p>
                <div className="mt-4 rounded-full bg-[#111111] px-6 py-4 text-center text-sm font-bold text-white">
                  Apple Pay / карта в Stripe Checkout
                </div>
                <div className="mt-5 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/50">
                  <span className="h-px flex-1 bg-outline-variant/30" />
                  или с карта
                  <span className="h-px flex-1 bg-outline-variant/30" />
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
                      Име върху картата
                    </label>
                    <div className="rounded-t-[1.4rem] border-b-4 border-primary/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
                      Защитено във Stripe Checkout
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
                      Номер на карта
                    </label>
                    <div className="rounded-t-[1.4rem] border-b-4 border-primary/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
                      Въвежда се в защитения Stripe прозорец
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
                        Професионалист
                      </label>
                      <div className="rounded-t-[1.4rem] border-b-4 border-primary/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
                        {summary.professionalName}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-on-surface-variant/60">
                        Проект
                      </label>
                      <div className="rounded-t-[1.4rem] border-b-4 border-primary/20 bg-surface-container-low px-5 py-4 text-sm text-on-surface-variant">
                        {summary.title}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm text-on-surface-variant">
                  <div className="flex items-center justify-between">
                    <span>Междинна сума</span>
                    <span>{formatCurrency(summary.amount, summary.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Такса за обслужване</span>
                    <span>{formatCurrency(summary.serviceFee, summary.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 text-base font-bold text-primary">
                    <span>Общо</span>
                    <span>{formatCurrency(summary.total, summary.currency)}</span>
                  </div>
                </div>

                {error ? (
                  <div className="mt-5 rounded-[1.5rem] bg-rose-100/80 px-4 py-3 text-sm text-rose-700" role="alert" aria-live="polite">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={submitting}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_34px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting
                    ? "Подготвяме checkout..."
                    : paymentId && initialState.payment?.status === "COMPLETED"
                      ? "Потвърди и отвори статуса"
                      : "Потвърди и плати"}
                </button>

                <p className="mt-4 text-center text-[11px] leading-6 text-on-surface-variant/60">
                  С кликване върху бутона се съгласявате с нашите общи условия и политиката за защитени плащания.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
