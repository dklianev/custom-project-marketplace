"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import {
  EditorialPanel,
  SectionEyebrow,
  TonalChip,
} from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import {
  buildRequestPayload,
  budgetOptions,
  cityOptions,
  priorityOptions,
  scopeOptions,
  styleOptions,
  timelineOptions,
  toRequestSearchParams,
  type ParsedRequestInterpretation,
  type RequestDraft,
} from "@/lib/request-flow";

type CreateRequestExperienceProps = {
  initialDraft: RequestDraft;
  initialRequestId?: string | null;
};

type RequestResponse = {
  request?: {
    id: string;
  };
  error?: string;
};

type ParseResponse = {
  interpretation?: ParsedRequestInterpretation;
  error?: string;
};

function buildLoginHref(draft: RequestDraft, requestId?: string | null) {
  const params = toRequestSearchParams(draft);
  if (requestId) {
    params.set("requestId", requestId);
  }

  return `/login?next=${encodeURIComponent(`/request/create?${params.toString()}`)}`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

export function CreateRequestExperience({
  initialDraft,
  initialRequestId,
}: CreateRequestExperienceProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [requestId, setRequestId] = useState(initialRequestId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const scope = useMemo(
    () => scopeOptions.find((option) => option.id === draft.scope) ?? scopeOptions[1],
    [draft.scope],
  );
  const priority = useMemo(
    () => priorityOptions.find((option) => option.id === draft.priority) ?? priorityOptions[0],
    [draft.priority],
  );

  const aiSummary = useMemo(
    () => [
      `Проектът е насочен към ${scope.title.toLowerCase()}.`,
      `Локацията е ${draft.city}, а желаният срок е ${draft.timeline.toLowerCase()}.`,
      `Основният приоритет е ${priority.title.toLowerCase()}.`,
    ],
    [draft.city, draft.timeline, priority.title, scope.title],
  );

  function updateDraft<Key extends keyof RequestDraft>(key: Key, value: RequestDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function parseWithAi() {
    const response = await fetch("/api/ai/parse-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: [draft.query.trim(), draft.notes.trim()].filter(Boolean).join("\n\n"),
      }),
    });
    const payload = await readJson<ParseResponse>(response);

    if (response.status === 401) {
      router.push(buildLoginHref(draft, requestId));
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return payload?.interpretation;
  }

  async function saveDraftRequest() {
    const interpretation = await parseWithAi();
    const payload = buildRequestPayload(draft, interpretation ?? undefined);
    const url = requestId ? `/api/requests/${requestId}` : "/api/requests";
    const method = requestId ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await readJson<RequestResponse>(response);

    if (response.status === 401) {
      router.push(buildLoginHref(draft, requestId));
      return null;
    }

    if (!response.ok || !result?.request?.id) {
      throw new Error(result?.error ?? "Не успяхме да запазим заявката.");
    }

    return result.request.id;
  }

  async function handleContinue() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatusText("AI прецизира заявката и подготвя черновата...");

    try {
      const savedRequestId = await saveDraftRequest();
      if (!savedRequestId) {
        return;
      }

      setRequestId(savedRequestId);
      const nextParams = toRequestSearchParams(draft);
      nextParams.set("requestId", savedRequestId);

      router.push(`/request/review?${nextParams.toString()}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да подготвим заявката.",
      );
    } finally {
      setIsSubmitting(false);
      setStatusText(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-24 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <SectionEyebrow className="mb-5">Уточняване на заявката</SectionEyebrow>
              <h1 className="max-w-4xl text-[2.6rem] font-extrabold leading-[0.98] tracking-[-0.06em] md:text-[4.8rem]">
                Нека прецизираме
                <span className="block text-primary-container">Вашия проект.</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Работим спокойно: още няколко уточнения и Atelier ще изпрати заявката към хората,
                които имат правилния контекст, опит и стил за този тип проект.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <EditorialPanel className="p-6 md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">AI вижда проекта така</p>
                <div className="mt-4 space-y-3">
                  {aiSummary.map((item) => (
                    <div key={item} className="rounded-[1.4rem] bg-surface-container-low px-4 py-4 text-sm font-semibold leading-7 text-on-surface-variant">
                      {item}
                    </div>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Какво ще се случи след това</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant">
                  <p>Ще подредим заявката в ясен бриф за професионалистите.</p>
                  <p>Ще изпратим само към подходящи профили, не към масов листинг.</p>
                  <p>Ще можеш да прегледаш всичко преди да го изпратиш окончателно.</p>
                </div>
              </EditorialPanel>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {statusText ? (
            <div className="mt-6 rounded-[1.6rem] bg-primary/8 px-5 py-4 text-sm font-medium text-primary">
              {statusText}
            </div>
          ) : null}

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">
            <div className="space-y-6">
              <EditorialPanel className="p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Вашата първоначална идея</p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Нека я превърнем в работещ бриф</h2>
                  </div>
                  {requestId ? (
                    <span className="inline-flex rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80">
                      Черновата е запазена
                    </span>
                  ) : null}
                </div>

                <textarea
                  value={draft.query}
                  onChange={(event) => updateDraft("query", event.target.value)}
                  rows={4}
                  className="mt-6 min-h-32 w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-base leading-8 text-on-surface outline-none transition-shadow focus:shadow-[inset_0_-2px_0_rgba(85,62,96,0.22)]"
                />
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <label className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Какъв тип ангажимент планирате?
                </label>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {scopeOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateDraft("scope", item.id)}
                      className={draft.scope === item.id ? "rounded-[1.8rem] border border-primary bg-primary/6 px-5 py-5 text-left shadow-[0_16px_34px_rgba(85,62,96,0.08)]" : "rounded-[1.8rem] border border-transparent bg-surface-container-high px-5 py-5 text-left transition-colors hover:bg-surface-container-low"}
                    >
                      <p className="text-base font-bold text-on-surface">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-on-surface-variant">{item.description}</p>
                    </button>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <label className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Къде и кога трябва да се случи проектът?
                </label>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-bold text-on-surface">Град</p>
                    <div className="flex flex-wrap gap-2">
                      {cityOptions.map((item) => (
                        <TonalChip
                          key={item}
                          active={draft.city === item}
                          onClick={() => updateDraft("city", item)}
                        >
                          {item}
                        </TonalChip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-bold text-on-surface">Срок</p>
                    <div className="flex flex-wrap gap-2">
                      {timelineOptions.map((item) => (
                        <TonalChip
                          key={item}
                          active={draft.timeline === item}
                          onClick={() => updateDraft("timeline", item)}
                        >
                          {item}
                        </TonalChip>
                      ))}
                    </div>
                  </div>
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <label className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Какъв бюджет сте планирали?
                </label>
                <div className="mt-5 flex flex-wrap gap-3">
                  {budgetOptions.map((item) => (
                    <TonalChip
                      key={item}
                      active={draft.budget === item}
                      onClick={() => updateDraft("budget", item)}
                    >
                      {item}
                    </TonalChip>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <label className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Кое е най-важно за резултата?
                </label>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {priorityOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateDraft("priority", item.id)}
                      className={draft.priority === item.id ? "rounded-[1.8rem] border border-primary bg-primary text-on-primary px-5 py-5 text-left shadow-[0_18px_40px_rgba(85,62,96,0.2)]" : "rounded-[1.8rem] border border-transparent bg-surface-container-high px-5 py-5 text-left transition-colors hover:bg-surface-container-low"}
                    >
                      <p className={draft.priority === item.id ? "text-base font-bold" : "text-base font-bold text-on-surface"}>{item.title}</p>
                      <p className={draft.priority === item.id ? "mt-2 text-sm leading-7 text-on-primary/78" : "mt-2 text-sm leading-7 text-on-surface-variant"}>{item.description}</p>
                    </button>
                  ))}
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <label className="text-2xl font-extrabold tracking-tight text-on-surface">
                  Има ли предпочитана естетика или ограничение?
                </label>
                <div className="mt-5 flex flex-wrap gap-2">
                  {styleOptions.map((item) => (
                    <TonalChip
                      key={item}
                      active={draft.style === item}
                      onClick={() => updateDraft("style", item)}
                    >
                      {item}
                    </TonalChip>
                  ))}
                </div>
                <textarea
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  rows={4}
                  className="mt-5 w-full resize-none rounded-[1.8rem] bg-surface-container-low px-6 py-5 text-base leading-8 text-on-surface outline-none transition-shadow focus:shadow-[inset_0_-2px_0_rgba(85,62,96,0.22)]"
                  placeholder="Напр. имаме домашен любимец, търсим повече място за съхранение, предпочитаме светли материали..."
                />
              </EditorialPanel>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-surface-container-low px-5 py-4">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-base font-black text-on-primary shadow-[0_18px_40px_rgba(85,62,96,0.18)] transition-[transform,opacity,box-shadow] duration-200 hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Подготвяме брифа..." : "Продължи нататък"}
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="space-y-6 lg:sticky lg:top-36">
              <EditorialPanel className="overflow-hidden p-0">
                <div className="relative h-[340px] w-full">
                  <Image
                    src="/editorial/request-active.svg"
                    alt="Визуален контекст за проекта"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <div className="px-6 py-6 md:px-7">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Спокойна подготовка</p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight">Подреждаме заявката, без да губим нюансите.</h2>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                    Всяко уточнение помага на Atelier да даде по-добър routing и да намали хаотичните оферти.
                  </p>
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">Доверие и подбор</p>
                <div className="mt-4 space-y-4">
                  {[
                    "Проверяваме профилите преди да им изпратим брифа.",
                    "Пазим процеса спокоен: заявка, оферти, плащане, статус.",
                    "Виждаш всичко преди окончателно изпращане.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-[1.5rem] bg-surface-container-low px-4 py-4">
                      <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      <p className="text-sm leading-7 text-on-surface-variant">{item}</p>
                    </div>
                  ))}
                </div>
              </EditorialPanel>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
