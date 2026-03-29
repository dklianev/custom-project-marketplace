"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionEyebrow, TonalChip } from "@/components/editorial-primitives";
import {
  budgetOptions,
  cityOptions,
  defaultRequestDraft,
  heroPromptSuggestions,
  timelineOptions,
  toRequestSearchParams,
} from "@/lib/request-flow";

export default function HeroSearch() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(defaultRequestDraft.query);
  const [city, setCity] = useState(defaultRequestDraft.city);
  const [budget, setBudget] = useState(defaultRequestDraft.budget);
  const [timeline, setTimeline] = useState(defaultRequestDraft.timeline);

  const canContinue = query.trim().length > 24;

  const summary = useMemo(
    () => [city, budget, timeline].filter(Boolean).join(" • "),
    [budget, city, timeline],
  );
  const summaryLabel = useMemo(
    () => summary.split(String.fromCharCode(7)).join(" / "),
    [summary],
  );

  function handleContinue() {
    if (!canContinue || isPending) {
      return;
    }

    const params = toRequestSearchParams({ query, city, budget, timeline });
    startTransition(() => {
      router.push(`/request/create?${params.toString()}`);
    });
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="ethereal-edge rounded-[3rem] p-3 md:p-4 shadow-[0_42px_120px_rgba(82,94,127,0.14)]">
        <div className="rounded-[2.6rem] bg-surface-container-lowest/88 px-5 py-6 md:px-8 md:py-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] bg-primary text-on-primary shadow-[0_20px_40px_rgba(85,62,96,0.22)]">
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-[30px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <SectionEyebrow>AI заявка</SectionEyebrow>
                  <span className="text-sm text-on-surface-variant">
                    AI ще структурира брифа и ще го изпрати към проверени професионалисти.
                  </span>
                </div>

                <label className="block">
                  <span className="sr-only">Опиши проекта си</span>
                  <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Опиши проекта си на нормален език. Какво искаш, къде се намира, какъв резултат очакваш?"
                    className="min-h-[144px] w-full resize-none rounded-[2rem] border-0 bg-transparent px-1 py-1 text-2xl font-extrabold leading-[1.2] text-on-surface outline-none transition-[background-color,box-shadow] duration-200 placeholder:text-on-surface/28 focus:bg-white/55 focus:shadow-[0_0_0_2px_rgba(85,62,96,0.18)] md:min-h-[168px] md:text-[2.7rem]"
                  />
                </label>
              </div>
            </div>

            <div className="soft-divider" />

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Град
                </p>
                <div className="flex flex-wrap gap-2">
                  {cityOptions.map((option) => (
                    <TonalChip
                      key={option}
                      active={city === option}
                      onClick={() => setCity(option)}
                    >
                      {option}
                    </TonalChip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Бюджет
                </p>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map((option) => (
                    <TonalChip
                      key={option}
                      active={budget === option}
                      onClick={() => setBudget(option)}
                    >
                      {option}
                    </TonalChip>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Срок
                </p>
                <div className="flex flex-wrap gap-2">
                  {timelineOptions.map((option) => (
                    <TonalChip
                      key={option}
                      active={timeline === option}
                      onClick={() => setTimeline(option)}
                    >
                      {option}
                    </TonalChip>
                  ))}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!canContinue || isPending}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-7 py-4 text-base font-black text-on-primary shadow-[0_22px_40px_rgba(85,62,96,0.26)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55 lg:w-auto"
                >
                  Продължи
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
          <span className="font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">
            В момента:
          </span>
          <span className="rounded-full bg-white/70 px-4 py-2 text-on-surface shadow-[0_12px_30px_rgba(77,66,96,0.06)]">
            {summaryLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
          <span className="font-bold uppercase tracking-[0.18em] text-on-surface-variant/60">
            Примери:
          </span>
          {heroPromptSuggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuery(prompt)}
              className="rounded-full bg-secondary-container/35 px-4 py-2 text-left font-semibold text-secondary transition-colors hover:bg-secondary-container/55"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
