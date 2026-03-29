"use client";

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
      `Локация: ${draft.city}.`,
      `Обхват: ${scope.title}.`,
      `Водещ приоритет: ${priority.title}.`,
      `Визуална посока: ${draft.style}.`,
    ],
    [draft.city, draft.style, priority.title, scope.title],
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
    setStatusText("AI структурира заявката и я подготвя за преглед...");

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

      <main className="flex-1 px-6 pb-28 pt-34 md:pb-20 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
            <div>
              <SectionEyebrow className="mb-5">AI уточняване</SectionEyebrow>
              <h1 className="max-w-4xl text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.4rem]">
                Нека уточним заявката спокойно,
                <span className="block text-primary">преди да го изпратим.</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Тук не попълваш формуляр. AI подрежда заявката ти в кратък,
                ясна и изпращаема заявка, която после виждаш в преглед.
              </p>

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

              <div className="mt-10 flex items-center gap-4">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70 shadow-[inset_0_0_0_1px_rgba(205,196,205,0.4)]">
                  <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#553e60_0%,#6e5678_55%,#7b90d8_100%)]" />
                </div>
                <span className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                  Стъпка 2 от 3
                </span>
              </div>

              <div className="mt-8 space-y-5">
                <EditorialPanel className="p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                        Original request
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                        Как да опишем проекта най-точно?
                      </h2>
                    </div>
                    {requestId ? (
                      <span className="inline-flex rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80">
                        Draft saved
                      </span>
                    ) : null}
                  </div>

                  <textarea
                    value={draft.query}
                    onChange={(event) => updateDraft("query", event.target.value)}
                    rows={5}
                    className="mt-6 min-h-36 w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-base leading-8 text-on-surface outline-none transition-shadow focus:shadow-[inset_0_-2px_0_rgba(85,62,96,0.22)]"
                  />
                </EditorialPanel>

                <EditorialPanel className="p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-2xl"
                      >
                        cognition
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                        AI summary
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                        Какво разбираме до момента
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {aiSummary.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </EditorialPanel>

                <EditorialPanel className="p-6 md:p-8">
                  <SectionEyebrow className="mb-4">Quick confirms</SectionEyebrow>
                  <div className="space-y-5">
                    <div>
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Град
                      </p>
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
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Бюджет
                      </p>
                      <div className="flex flex-wrap gap-2">
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
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Срок
                      </p>
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

                    <div>
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Обхват
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {scopeOptions.map((item) => (
                          <TonalChip
                            key={item.id}
                            active={draft.scope === item.id}
                            onClick={() => updateDraft("scope", item.id)}
                          >
                            {item.title}
                          </TonalChip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Водещ приоритет
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {priorityOptions.map((item) => (
                          <TonalChip
                            key={item.id}
                            active={draft.priority === item.id}
                            onClick={() => updateDraft("priority", item.id)}
                          >
                            {item.title}
                          </TonalChip>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-bold text-on-surface">
                        Стил
                      </p>
                      <div className="flex flex-wrap gap-2">
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
                    </div>
                  </div>
                </EditorialPanel>

                <EditorialPanel className="p-6 md:p-8">
                  <SectionEyebrow className="mb-4">Additional context</SectionEyebrow>
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.target.value)}
                    rows={5}
                    className="min-h-32 w-full resize-none rounded-[1.8rem] bg-surface-container-low px-5 py-5 text-base leading-8 text-on-surface outline-none transition-shadow focus:shadow-[inset_0_-2px_0_rgba(85,62,96,0.22)]"
                    placeholder="Какво е важно да знаят професионалистите още сега?"
                  />
                </EditorialPanel>
              </div>
            </div>

            <div className="lg:sticky lg:top-36">
              <div className="space-y-5">
                <EditorialPanel className="p-6 md:p-8">
                  <SectionEyebrow className="mb-4">Why this step matters</SectionEyebrow>
                  <div className="space-y-4 text-sm leading-7 text-on-surface-variant">
                    <p>
                      Запазваме заявката като чернова, за да не губиш контекст и да
                      можеш да се върнеш без да почваш отначало.
                    </p>
                    <p>
                      После ще видиш ясен преглед, преди да изпратим заявката към
                      подходящите професионалисти.
                    </p>
                  </div>
                </EditorialPanel>

                <EditorialPanel className="bg-primary p-6 text-on-primary md:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-on-primary/70">
                    Next
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">
                    Запази заявката и отвори прегледа.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-on-primary/78">
                    Следващата стъпка вече е реален преглед на заявката, не
                    декоративен screen.
                  </p>
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={isSubmitting}
                    className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-base font-black text-primary shadow-[0_18px_36px_rgba(22,19,31,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? "Подготвяме заявката..." : "Продължи към преглед"}
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-xl"
                    >
                      arrow_forward
                    </span>
                  </button>
                </EditorialPanel>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
