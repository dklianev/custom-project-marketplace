"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ErrorResponse = {
  error?: string;
};

type AcceptOfferResponse = {
  nextUrl?: string;
  payment?: { id: string };
  project?: { id: string };
};

type OfferDecisionActionsProps = {
  role: "CLIENT" | "PROFESSIONAL";
  offerId: string;
  offerStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  paymentHref: string;
  compareHref: string;
  projectHref?: string | null;
  dashboardHref: string;
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

export function OfferDecisionActions({
  role,
  offerId,
  offerStatus,
  paymentHref,
  compareHref,
  projectHref,
  dashboardHref,
}: OfferDecisionActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role === "PROFESSIONAL") {
    return (
      <div className="space-y-3" id="decision">
        <div className="flex flex-wrap gap-3">
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
          >
            Към таблото за професионалиста
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              arrow_forward
            </span>
          </Link>
          <Link
            href={compareHref}
            className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white"
          >
            Назад към сравнение
          </Link>
        </div>
      </div>
    );
  }

  const canAccept = offerStatus === "PENDING";
  const isLocked = offerStatus === "REJECTED" || offerStatus === "EXPIRED";

  const handleAccept = async () => {
    if (!canAccept || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Не успяхме да приемем офертата."),
        );
      }

      const payload = await readJson<AcceptOfferResponse>(response);
      router.push(payload?.nextUrl ?? paymentHref);
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Не успяхме да приемем офертата.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3" id="decision">
      <div className="flex flex-wrap gap-3">
        {isLocked ? (
          <Link
            href={compareHref}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
          >
            Виж други оферти
          </Link>
        ) : canAccept ? (
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Приемаме офертата..." : "Приеми и продължи към плащане"}
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              arrow_forward
            </span>
          </button>
        ) : (
          <Link
            href={paymentHref}
            className="inline-flex items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 text-sm font-black text-on-primary shadow-[0_18px_36px_rgba(85,62,96,0.2)] transition-opacity hover:opacity-95"
          >
            Продължи към плащане
            <span aria-hidden="true" className="material-symbols-outlined text-xl">
              arrow_forward
            </span>
          </Link>
        )}

        <Link
          href={compareHref}
          className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-white"
        >
          Назад към сравнение
        </Link>

        {projectHref ? (
          <Link
            href={projectHref}
            className="inline-flex items-center justify-center rounded-full bg-white/85 px-6 py-4 text-sm font-bold text-on-surface shadow-[0_14px_28px_rgba(77,66,96,0.08)] transition-colors hover:bg-white"
          >
            Отвори проекта
          </Link>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-[1.4rem] bg-rose-100/80 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
