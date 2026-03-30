"use client";

import Image from "next/image";
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
              : "Не успяхме да заредим детайлите.",
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
          <div className="text-center">
            <span className="inline-block text-xs font-black uppercase tracking-[0.18em] text-primary/80">Преглед на заявката</span>
            <h1 className="mt-4 text-[2.7rem] font-extrabold tracking-[-0.06em] text-on-surface md:text-[4.8rem]">Финална проверка</h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-on-surface-variant md:text-lg">
              Още един поглед, преди Atelier да изпрати брифа към правилните професионалисти.
              Можеш да редактираш, да прегледаш структурирания контекст и да решиш спокойно.
            </p>
          </div>

          {error ? (
            <div className="mx-auto mt-6 max-w-5xl rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
            <div className="space-y-6">
              <EditorialPanel className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-primary/10 text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined text-2xl">cognition</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">AI анализ на категорията</h2>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                          Atelier подготви заявката като структуриран бриф за точния тип професионалист.
                        </p>
                      </div>
                      <Link
                        href={`/request/create?${queryString}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-container"
                      >
                        Редактирай
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span>
                      </Link>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {[request?.category ?? "Curated project request", request?.subCategory ?? draft.scope, draft.style]
                        .filter(Boolean)
                        .map((item) => (
                          <span key={item} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface">
                            {item}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Вашето оригинално съобщение</h2>
                  <Link href={`/request/create?${queryString}`} className="text-sm font-bold uppercase tracking-[0.14em] text-primary/80 transition-colors hover:text-primary">
                    Промени
                  </Link>
                </div>
                <div className="mt-5 rounded-[1.8rem] border border-primary/15 bg-surface-container-low px-6 py-6 text-base leading-8 text-on-surface-variant shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                  “{draft.query}”
                </div>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Структуриран бриф</h2>
                {isLoading ? (
                  <div className="mt-5 rounded-[1.8rem] bg-surface-container-low px-5 py-6 text-sm text-on-surface-variant">
                    Зареждаме структурирания бриф...
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.7rem] bg-surface-container-low px-5 py-5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/65">Локация и параметри</p>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant">
                        <p><span className="font-bold text-on-surface">Град:</span> {request?.location ?? draft.city}</p>
                        <p><span className="font-bold text-on-surface">Бюджет:</span> {request?.budget ?? draft.budget}</p>
                        <p><span className="font-bold text-on-surface">Срок:</span> {request?.timeline ?? draft.timeline}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.7rem] bg-surface-container-low px-5 py-5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/65">Подход и приоритет</p>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant">
                        <p><span className="font-bold text-on-surface">Обхват:</span> {request?.area ?? draft.scope}</p>
                        <p><span className="font-bold text-on-surface">Приоритет:</span> {request?.priorities?.[0] ?? draft.priority}</p>
                        <p><span className="font-bold text-on-surface">Стил:</span> {draft.style}</p>
                      </div>
                    </div>

                    <div className="rounded-[1.7rem] bg-surface-container-low px-5 py-5 md:col-span-2">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/65">Допълнителни бележки</p>
                      <p className="mt-4 text-sm leading-7 text-on-surface-variant">{request?.specificNotes ?? draft.notes}</p>
                    </div>
                  </div>
                )}
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">Приложени файлове</h2>
                  <button type="button" className="text-sm font-bold text-primary">+ Добави още</button>
                </div>
                <div className="mt-5 flex gap-4 overflow-x-auto pb-1">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[1.6rem] bg-surface-container-low">
                    <Image src="/editorial/request-active.svg" alt="Примерен файл към заявката" fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[1.6rem] border border-dashed border-outline-variant/70 bg-surface-container-low text-sm font-bold text-on-surface-variant">
                    + Добави още
                  </div>
                </div>
              </EditorialPanel>
            </div>

            <div className="space-y-6 lg:sticky lg:top-36">
              <EditorialPanel className="bg-primary p-6 text-on-primary md:p-8">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-on-primary/70">Готово за изпращане</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">Вашата заявка ще бъде изпратена до подбрани професионалисти.</h2>
                <p className="mt-4 text-sm leading-7 text-on-primary/78">
                  След изпращане ще следим офертите, въпросите и следващите стъпки в един trust-first процес.
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!requestId || isLoading || isSubmitting}
                  className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-base font-black text-primary shadow-[0_18px_36px_rgba(22,19,31,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isSubmitting ? "Изпращаме заявката..." : "Изпрати заявката"}
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">send</span>
                </button>
                <Link
                  href="/offers/compare"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-4 text-sm font-bold text-white/90 transition-colors hover:bg-white/8"
                >
                  Прегледай пример за сравнение
                </Link>
              </EditorialPanel>

              <EditorialPanel className="p-6 md:p-8">
                <SectionEyebrow className="mb-4">Какво следва?</SectionEyebrow>
                <div className="space-y-4 text-sm leading-7 text-on-surface-variant">
                  <div className="flex items-start gap-3"><span className="material-symbols-outlined mt-0.5 text-primary">check_circle</span><p>Изпращаме брифа само към релевантни профили.</p></div>
                  <div className="flex items-start gap-3"><span className="material-symbols-outlined mt-0.5 text-primary">check_circle</span><p>Първите оферти обикновено идват в рамките на няколко часа.</p></div>
                  <div className="flex items-start gap-3"><span className="material-symbols-outlined mt-0.5 text-primary">check_circle</span><p>Ще можеш да сравниш цена, срок, доверие и подход спокойно.</p></div>
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
