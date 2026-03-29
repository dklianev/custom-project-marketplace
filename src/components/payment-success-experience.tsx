"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";

type PaymentResponse = {
  payment?: {
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
        budget: string | null;
        timeline: string | null;
        location: string | null;
      };
      professional: {
        name: string;
        verified: boolean;
      };
    };
  };
  error?: string;
};

type PaymentSuccessExperienceProps = {
  paymentId?: string | null;
};

type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED";

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function formatCurrency(value: number, currency = "BGN") {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function statusCopy(status: PaymentStatus | undefined) {
  switch (status) {
    case "COMPLETED":
      return "Плащането е завършено и проектът вече е в защитения поток на Atelier.";
    case "PROCESSING":
      return "Плащането още се обработва, но заявката вече е в ход.";
    case "FAILED":
      return "Плащането не е минало успешно. Можеш да опиташ отново от екрана за плащане.";
    case "REFUNDED":
      return "Плащането е възстановено.";
    default:
      return "Плащането е подготвено и скоро ще видиш актуален статус.";
  }
}

export function PaymentSuccessExperience({
  paymentId,
}: PaymentSuccessExperienceProps) {
  const [payment, setPayment] = useState<PaymentResponse["payment"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(paymentId));

  useEffect(() => {
    if (!paymentId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPayment() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/payments/${paymentId}`, {
          cache: "no-store",
        });
        const payload = await readJson<PaymentResponse>(response);

        if (!response.ok || !payload?.payment) {
          throw new Error(payload?.error ?? "Не успяхме да заредим плащането.");
        }

        if (!cancelled) {
          setPayment(payload.payment);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не успяхме да заредим плащането.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPayment();

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const receiptHref = payment ? `/api/payments/${payment.id}/receipt` : null;
  const projectHref = payment ? `/project/${payment.project.id}` : "/dashboard";
  const headline = useMemo(() => {
    if (!payment) {
      return "Плащането е обработено.";
    }

    return payment.status === "COMPLETED"
      ? "Плащането е потвърдено."
      : "Плащането е прието в Atelier.";
  }, [payment]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="relative flex-1 overflow-hidden px-6 pb-24 pt-28 md:pt-36">
        <div className="absolute right-[-5%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-primary-fixed/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[35rem] w-[35rem] rounded-full bg-secondary-fixed/30 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl text-center">
            <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_30px_60px_rgba(85,62,96,0.08)]">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-5xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <SectionEyebrow className="mb-5">Защитено плащане</SectionEyebrow>
            <h1 className="text-[3rem] font-extrabold leading-tight tracking-[-0.06em] text-primary md:text-[4.4rem]">
              {headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-on-surface-variant">
              {statusCopy(payment?.status)}
            </p>
          </div>

          {!paymentId ? (
            <EditorialPanel className="mx-auto mt-10 max-w-3xl p-8">
              <h2 className="text-2xl font-extrabold tracking-tight">
                Липсва идентификатор на плащането
              </h2>
              <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                За този екран ни трябва реално `paymentId`, за да покажем
                потвърждението и разписката.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
              >
                Към таблото
              </Link>
            </EditorialPanel>
          ) : (
            <div className="mt-12 grid gap-8 md:grid-cols-12">
              <EditorialPanel className="relative overflow-hidden p-8 md:col-span-7">
                {isLoading ? (
                  <p className="text-sm leading-7 text-on-surface-variant">
                    Зареждаме плащането...
                  </p>
                ) : error ? (
                  <div className="rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                    {error}
                  </div>
                ) : payment ? (
                  <div className="space-y-8">
                    <div className="flex items-end justify-between gap-6 border-b border-outline-variant/20 pb-5">
                      <div>
                        <p className="text-sm text-on-surface-variant">
                          Плащане
                        </p>
                        <p className="mt-1 text-xl font-bold text-primary">
                          {payment.invoiceNumber ?? `#${payment.id.slice(-8).toUpperCase()}`}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80">
                        {payment.status}
                      </span>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <p className="text-sm text-on-surface-variant">Услуга</p>
                        <p className="mt-1 text-2xl font-extrabold text-primary">
                          {payment.project.request.title}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        {[payment.project.request.location, payment.project.request.budget, payment.project.request.timeline].map(
                          (item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-[1.5rem] bg-surface-container-low px-4 py-4"
                            >
                              <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
                                {index === 0
                                  ? "Локация"
                                  : index === 1
                                    ? "Бюджет"
                                    : "Срок"}
                              </p>
                              <p className="mt-2 font-semibold text-on-surface">
                                {item ?? "По заявката"}
                              </p>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Разбивка
                        </p>
                        <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
                          <div className="flex items-center justify-between">
                            <span>Услуга</span>
                            <span className="font-bold text-on-surface">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Платформена такса</span>
                            <span className="font-bold text-on-surface">
                              {formatCurrency(payment.serviceFee, payment.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                            <span className="font-medium text-on-surface">Общо</span>
                            <span className="text-xl font-extrabold text-primary">
                              {formatCurrency(payment.total, payment.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </EditorialPanel>

              <div className="space-y-8 md:col-span-5">
                <EditorialPanel className="p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                      Следва какво
                  </p>
                  <div className="mt-5 space-y-4">
                    {[
                      payment?.project.professional.verified
                        ? "Професионалистът е верифициран и може да започне през защитения чат."
                        : "Проектът вече е активен в чата и статуса на работа.",
                      "Ще следиш етапите, чата и финалното ревю от клиентското табло.",
                      "Разписката вече е достъпна като реален PDF документ.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.5rem] bg-surface-container-low px-4 py-4 text-sm leading-7 text-on-surface-variant"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </EditorialPanel>

                <EditorialPanel className="bg-primary p-8 text-on-primary">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-on-primary/70">
                    Продължи нататък
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">
                    Проектът е готов за следващата стъпка.
                  </h2>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      href={projectHref}
                      className="inline-flex items-center justify-center rounded-full bg-white px-6 py-4 text-sm font-bold text-primary"
                    >
                      Отвори проекта
                    </Link>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-4 text-sm font-bold text-on-primary"
                    >
                      Към таблото
                    </Link>
                    {receiptHref ? (
                      <a
                        href={receiptHref}
                        className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-4 text-sm font-bold text-on-primary"
                      >
                        Изтегли PDF разписка
                      </a>
                    ) : null}
                  </div>
                </EditorialPanel>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
