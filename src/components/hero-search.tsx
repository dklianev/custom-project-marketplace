"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SectionEyebrow } from "@/components/editorial-primitives";
import {
  defaultRequestDraft,
  timelineOptions,
  toRequestSearchParams,
} from "@/lib/request-flow";

export default function HeroSearch() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(defaultRequestDraft.query);
  const [city, setCity] = useState(defaultRequestDraft.city);
  const [budget, setBudget] = useState(defaultRequestDraft.budget);
  const [timeline, setTimeline] = useState(defaultRequestDraft.timeline || timelineOptions[0] || "");

  const canContinue = query.trim().length > 24;

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
    <div className="mx-auto w-full max-w-4xl rounded-[2.7rem] bg-surface-container-lowest px-4 py-4 shadow-[0_32px_90px_rgba(85,62,96,0.1)] md:px-7 md:py-7">
      <div className="flex flex-col gap-6">
        <div className="rounded-[2.2rem] bg-surface-container-low px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-wrap items-center gap-3">
            <SectionEyebrow className="bg-white/70">AI бриф</SectionEyebrow>
            <span className="text-sm font-medium text-on-surface-variant">
              Опиши проекта естествено, а Atelier ще подреди детайлите в работещ бриф.
            </span>
          </div>

          <div className="relative mt-4">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Напиши какво търсиш: например ремонт на баня в София, дизайн на сайт или поръчкова изработка..."
              className="min-h-[148px] w-full resize-none rounded-[1.8rem] border-0 bg-transparent px-1 py-1 text-xl font-extrabold leading-[1.2] text-on-surface outline-none transition-[box-shadow,background-color] duration-200 placeholder:text-on-surface/35 focus:bg-white/45 focus:shadow-[0_0_0_2px_rgba(85,62,96,0.12)] md:min-h-[164px] md:text-[2rem]"
            />
            <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-primary/6 px-3 py-1.5 text-primary shadow-[0_8px_20px_rgba(85,62,96,0.06)]">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                mic
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.18em]">Гласово</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="rounded-[1.6rem] bg-surface-container-low px-4 py-4 text-left shadow-[0_10px_24px_rgba(77,66,96,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">Локация</span>
            <span className="mt-2 flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">
                location_on
              </span>
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Град или район"
                className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
            </span>
          </label>

          <label className="rounded-[1.6rem] bg-surface-container-low px-4 py-4 text-left shadow-[0_10px_24px_rgba(77,66,96,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">Бюджет</span>
            <span className="mt-2 flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">
                payments
              </span>
              <input
                type="text"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Ориентировъчно"
                className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
            </span>
          </label>

          <label className="rounded-[1.6rem] bg-surface-container-low px-4 py-4 text-left shadow-[0_10px_24px_rgba(77,66,96,0.04)]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-outline">Срок</span>
            <span className="mt-2 flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary text-xl">
                schedule
              </span>
              <select
                value={timeline}
                onChange={(event) => setTimeline(event.target.value)}
                className="w-full appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-on-surface outline-none"
              >
                {timelineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || isPending}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-[linear-gradient(120deg,#553e60_0%,#6e5678_100%)] px-7 py-4 text-base font-black text-on-primary shadow-[0_22px_44px_rgba(85,62,96,0.2)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
        >
          Изпрати запитване
          <span aria-hidden="true" className="material-symbols-outlined text-lg">
            send
          </span>
        </button>
      </div>
    </div>
  );
}
