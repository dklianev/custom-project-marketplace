"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import {
  requestRecordToDraft,
  toRequestSearchParams,
  type RequestDraft,
} from "@/lib/request-flow";

type RequestRecord = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  subCategory: string | null;
  budget: string | null;
  timeline: string | null;
  location: string | null;
  area: string | null;
  priorities: string[];
  specificNotes: string | null;
  status: string;
  offers?: Array<{ id: string }>;
};

type RequestResponse = {
  request?: RequestRecord;
  error?: string;
};

type RequestReviewExperienceProps = {
  requestId?: string | null;
  fallbackDraft: RequestDraft;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

export function RequestReviewExperience({
  requestId,
  fallbackDraft,
}: RequestReviewExperienceProps) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(requestId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const next = encodeURIComponent(`/request/review?requestId=${requestId}`);
          router.replace(`/login?next=${next}`);
          return;
        }

        if (!response.ok || !payload?.request) {
          throw new Error(payload?.error ?? "Не успяхме да заредим заявката.");
        }

        if (!cancelled) {
          setRequest(payload.request);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не успяхме да заредим заявката.",
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

  const draft = useMemo(
    () => (request ? requestRecordToDraft(request) : fallbackDraft),
    [fallbackDraft, request],
  );
  const queryString = useMemo(() => {
    const params = toRequestSearchParams(draft);
    if (requestId) {
      params.set("requestId", requestId);
    }
    return params.toString();
  }, [draft, requestId]);

  async function handleSubmit() {
    if (!requestId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/requests/${requestId}/submit`, {
        method: "POST",
      });
      const payload = await readJson<RequestResponse>(response);

      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/request/review?requestId=${requestId}`)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error ?? "Не успяхме да изпратим заявката.");
      }

      router.push(`/request/loading?requestId=${requestId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не успяхме да изпратим заявката.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <SectionEyebrow className="mb-5">Structured review</SectionEyebrow>
              <h1 className="max-w-4xl text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.06em] md:text-[4.5rem]">
                Ето заявката,
                <span className="block text-primary">преди да го изпратим нататък.</span>
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
                Това вече е реалният преглед на запазена заявка. Оттук или
                редактираш, или я изпращаме към подходящите професионалисти.
              </p>

              {error ? (
                <div className="mt-6 rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 space-y-5">
                <EditorialPanel className="p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                        Request summary
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                        {request?.title ?? draft.query}
                      </h2>
                    </div>
                    <Link
                      href={`/request/create?${queryString}`}
                      className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-white"
                    >
                      Редактирай
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-lg"
                      >
                        edit
                      </span>
                    </Link>
                  </div>

                  <div className="mt-6 rounded-[1.9rem] bg-surface-container-low px-6 py-6 text-lg italic leading-8 text-on-surface-variant">
                    &ldquo;{draft.query}&rdquo;
                  </div>
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
                        Структурирана заявка
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                        Какво ще изпратим към професионалистите
                      </h2>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="mt-6 rounded-[1.8rem] bg-surface-container-low px-5 py-6 text-sm text-on-surface-variant">
                      Зареждаме реалната заявка...
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Контекст
                        </p>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant">
                          <p>
                            <span className="font-bold text-on-surface">Град:</span>{" "}
                            {request?.location ?? draft.city}
                          </p>
                          <p>
                            <span className="font-bold text-on-surface">Бюджет:</span>{" "}
                            {request?.budget ?? draft.budget}
                          </p>
                          <p>
                            <span className="font-bold text-on-surface">Срок:</span>{" "}
                            {request?.timeline ?? draft.timeline}
                          </p>
                          <p>
                            <span className="font-bold text-on-surface">Обхват:</span>{" "}
                            {request?.area ?? draft.scope}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Routing
                        </p>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant">
                          <p>
                            <span className="font-bold text-on-surface">Категория:</span>{" "}
                            {request?.category ?? "Curated project request"}
                          </p>
                          <p>
                            <span className="font-bold text-on-surface">Подкатегория:</span>{" "}
                            {request?.subCategory ?? "Ще се уточни при matching"}
                          </p>
                          <p>
                            <span className="font-bold text-on-surface">Приоритети:</span>{" "}
                            {request?.priorities?.join(", ") || "Trust-first подбор"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.8rem] bg-surface-container-low px-5 py-5 md:col-span-2">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          Допълнителни бележки
                        </p>
                        <p className="mt-4 text-sm leading-7 text-on-surface-variant">
                          {request?.specificNotes ?? draft.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </EditorialPanel>
              </div>
            </div>

            <div className="lg:sticky lg:top-36">
              <div className="space-y-5">
                <EditorialPanel className="p-6 md:p-8">
                  <SectionEyebrow className="mb-4">What happens next</SectionEyebrow>
                  <div className="space-y-4">
                    {[
                      "Изпращаме заявката само към подходящи и проверени професионалисти.",
                      "Получаваш оферти за сравнение, вместо да търсиш на ръка.",
                      "Следиш чат, статус и плащане в един trust-first flow.",
                    ].map((item, index) => (
                      <div key={item} className="flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                          {index + 1}
                        </div>
                        <p className="text-sm leading-7 text-on-surface-variant">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </EditorialPanel>

                <EditorialPanel className="bg-primary p-6 text-on-primary md:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-on-primary/70">
                    Send request
                  </p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">
                    Изпрати заявката към подбора.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-on-primary/78">
                    Тук вече извикваме реалния submit endpoint и прехвърляме към
                    loading flow-а.
                  </p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!requestId || isLoading || isSubmitting}
                    className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-base font-black text-primary shadow-[0_18px_36px_rgba(22,19,31,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? "Изпращаме заявката..." : "Изпрати заявката"}
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-xl"
                    >
                      send
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
