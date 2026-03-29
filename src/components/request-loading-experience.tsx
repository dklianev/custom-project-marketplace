"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Footer } from "@/components/footer";
import { EditorialPanel, SectionEyebrow } from "@/components/editorial-primitives";
import { Navbar } from "@/components/navbar";
import { createOptionalClient } from "@/lib/supabase/client";

type RequestRecord = {
  id: string;
  title: string;
  status: "DRAFT" | "PENDING" | "MATCHING" | "OFFERS_RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  budget: string | null;
  timeline: string | null;
  location: string | null;
  offers?: Array<{ id: string }>;
  project?: { id: string } | null;
};

type RequestResponse = {
  request?: RequestRecord;
  error?: string;
};

const POLLING_STATUSES = new Set(["DRAFT", "PENDING", "MATCHING"]);
const LIVE_DONE_STATUSES = new Set(["OFFERS_RECEIVED", "IN_PROGRESS", "COMPLETED"]);

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

async function fetchRequestRecord(requestId: string) {
  const response = await fetch(`/api/requests/${requestId}`, {
    cache: "no-store",
  });
  const payload = await readJson<RequestResponse>(response);

  if (!response.ok || !payload?.request) {
    throw new Error(payload?.error ?? "Не успяхме да заредим заявката.");
  }

  return payload.request;
}

function statusLabel(status: RequestRecord["status"] | undefined) {
  switch (status) {
    case "DRAFT":
      return "Чернова";
    case "PENDING":
      return "Готова за изпращане";
    case "MATCHING":
      return "Търсим подходящи професионалисти";
    case "OFFERS_RECEIVED":
      return "Офертите пристигат";
    case "IN_PROGRESS":
      return "Имате активен проект";
    case "COMPLETED":
      return "Завършена";
    case "CANCELLED":
      return "Спряна";
    default:
      return "Подготвяме заявката";
  }
}

function buildPrimaryAction(requestId: string, request: RequestRecord | null) {
  const offersCount = request?.offers?.length ?? 0;

  if (offersCount > 0) {
    return {
      href: `/offers/compare?requestId=${requestId}`,
      label: offersCount === 1 ? "Виж получената оферта" : "Сравни офертите",
    };
  }

  if (request?.project?.id) {
    return {
      href: `/project/${request.project.id}`,
      label: "Отвори проекта",
    };
  }

  return {
    href: "/dashboard",
    label: "Отвори клиентското табло",
  };
}

export function RequestLoadingExperience({
  requestId,
}: {
  requestId?: string | null;
}) {
  const supabase = useMemo(() => createOptionalClient(), []);
  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(requestId));
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!requestId) {
      setIsLoading(false);
      return null;
    }

    const nextRequest = await fetchRequestRecord(requestId);
    setRequest(nextRequest);
    setError(null);
    setIsLoading(false);
    return nextRequest;
  }, [requestId]);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    let cancelled = false;

    void fetchRequestRecord(requestId)
      .then((nextRequest) => {
        if (!cancelled) {
          setRequest(nextRequest);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не успяхме да заредим заявката.",
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    const shouldPoll = !request || POLLING_STATUSES.has(request.status);
    if (!shouldPoll) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadRequest().catch(() => {
        // Keep the latest known state if a background refresh fails.
      });
    }, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadRequest, request, requestId]);

  useEffect(() => {
    if (!supabase || !requestId) {
      return;
    }

    const channel = supabase
      .channel(`requests:${requestId}:status`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `id=eq.${requestId}`,
        },
        () => {
          void loadRequest().catch(() => {
            // Ignore transient realtime refresh failures.
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "offers",
          filter: `requestId=eq.${requestId}`,
        },
        () => {
          void loadRequest().catch(() => {
            // Ignore transient realtime refresh failures.
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "offers",
          filter: `requestId=eq.${requestId}`,
        },
        () => {
          void loadRequest().catch(() => {
            // Ignore transient realtime refresh failures.
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "offers",
          filter: `requestId=eq.${requestId}`,
        },
        () => {
          void loadRequest().catch(() => {
            // Ignore transient realtime refresh failures.
          });
        },
      );

    channel.subscribe((status) => {
      setIsRealtimeActive(status === "SUBSCRIBED");
    });

    return () => {
      setIsRealtimeActive(false);
      void supabase.removeChannel(channel);
    };
  }, [loadRequest, requestId, supabase]);

  const offersCount = request?.offers?.length ?? 0;
  const primaryAction = buildPrimaryAction(requestId ?? "", request);
  const isMatchingLive = request ? LIVE_DONE_STATUSES.has(request.status) : false;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <Navbar />

      <main className="flex-1 px-6 pb-20 pt-34 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr]">
            <div className="space-y-5">
              <SectionEyebrow className="mb-1">AI насочване</SectionEyebrow>
              <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.05em] md:text-6xl">
                AI вече подрежда
                <span className="block text-primary">следващите правилни стъпки.</span>
              </h1>
              <p className="text-base leading-8 text-on-surface-variant md:text-lg">
                Това не е декоративен екран за изчакване. Следим реалния статус на заявката,
                новите оферти и момента, в който можеш да влезеш в пространството за избор.
              </p>
            </div>

            <EditorialPanel className="p-6 md:p-8">
              {!requestId ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Липсва идентификатор на заявката
                  </h2>
                  <p className="text-sm leading-7 text-on-surface-variant">
                    Ако още нямаш активна заявка, започни от уточняващия поток и
                    създай заявката си.
                  </p>
                  <Link
                    href="/request/create"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
                  >
                    Към уточняването
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-primary/70">
                        Състояние на заявката
                      </p>
                      <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                        {request?.title ?? "Подготвяме routing статуса..."}
                      </h2>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isRealtimeActive ? (
                        <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                          Жива синхронизация
                        </span>
                      ) : null}
                      <span className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary/80">
                        {statusLabel(request?.status)}
                      </span>
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-[1.6rem] bg-rose-100/80 px-5 py-4 text-sm font-medium text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    {[
                      {
                        label: "Заявката е запазена",
                        done: Boolean(request),
                        text: "Заявката е създадена и вече има собствен идентификатор.",
                      },
                      {
                        label: "Подборът е започнал",
                        done: Boolean(request?.status && request.status !== "DRAFT" && request.status !== "PENDING"),
                        text: "AI routing вече търси най-подходящите проверени професионалисти.",
                      },
                      {
                        label: "Офертите са готови",
                        done: offersCount > 0 || request?.status === "OFFERS_RECEIVED" || request?.status === "IN_PROGRESS",
                        text: offersCount > 0
                          ? `Вече имаш ${offersCount} ${offersCount === 1 ? "оферта" : "оферти"} за сравнение.`
                          : "Щом влязат офертите, ще можеш веднага да отвориш пространството за избор.",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-4 rounded-[1.6rem] bg-surface-container-low px-5 py-5"
                      >
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white">
                          {item.done ? (
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-primary"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              check_circle
                            </span>
                          ) : (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{item.label}</p>
                          <p className="mt-1 text-sm leading-7 text-on-surface-variant">{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: "Град", value: request?.location ?? "-" },
                      { label: "Бюджет", value: request?.budget ?? "-" },
                      { label: "Срок", value: request?.timeline ?? "-" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[1.6rem] bg-surface-container-low px-5 py-5">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/70">
                          {item.label}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-on-surface">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={primaryAction.href}
                      className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-bold text-on-primary"
                    >
                      {primaryAction.label}
                    </Link>
                    <Link
                      href={`/request/review?requestId=${requestId}`}
                      className="inline-flex items-center justify-center rounded-full bg-surface-container-low px-6 py-4 text-sm font-bold text-on-surface"
                    >
                      Върни се към заявката
                    </Link>
                  </div>

                  {isLoading && !request ? (
                    <p className="text-sm font-medium text-on-surface-variant">
                      Зареждаме статуса на заявката...
                    </p>
                  ) : null}

                  {isMatchingLive ? (
                    <p className="text-sm leading-7 text-on-surface-variant">
                      Щом AI намери съвпадения или проектът тръгне, този екран се обновява автоматично чрез realtime канал и background refresh.
                    </p>
                  ) : null}
                </div>
              )}
            </EditorialPanel>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
