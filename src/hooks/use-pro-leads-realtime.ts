"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createOptionalClient } from "@/lib/supabase/client";
import type { MatchingRequest, ProLead } from "@/lib/pro-leads";
import { mapRequestToLead } from "@/lib/pro-leads";

type RequestsResponse = {
  requests: MatchingRequest[];
};

type ErrorResponse = {
  error?: string;
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

export function useProLeadsRealtime() {
  const supabase = useMemo(() => createOptionalClient(), []);
  const [leads, setLeads] = useState<ProLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const loadLeads = useCallback(async () => {
    const response = await fetch("/api/requests?status=MATCHING", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Не успях да заредя новите заявки."));
    }

    const payload = await readJson<RequestsResponse>(response);
    return (payload?.requests ?? []).map(mapRequestToLead);
  }, []);

  const refresh = useCallback(async () => {
    const nextLeads = await loadLeads();
    setLeads(nextLeads);
    return nextLeads;
  }, [loadLeads]);

  useEffect(() => {
    let cancelled = false;

    void loadLeads()
      .then((nextLeads) => {
        if (!cancelled) {
          setLeads(nextLeads);
          setError(null);
        }
      })
      .catch((refreshError) => {
        if (!cancelled) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Не успях да заредя новите заявки.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadLeads]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("requests:new")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "requests",
          filter: "status=eq.MATCHING",
        },
        () => {
          void refresh().catch(() => {
            // Keep the current list if background refresh fails.
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
        },
        () => {
          void refresh().catch(() => {
            // Keep the current list if background refresh fails.
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "requests",
        },
        () => {
          void refresh().catch(() => {
            // Keep the current list if background refresh fails.
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
  }, [refresh, supabase]);

  const urgentCount = leads.filter((lead) => lead.urgency === "URGENT").length;
  const plannedCount = leads.filter((lead) => lead.urgency === "PLANNED").length;

  return {
    leads,
    loading,
    error,
    isRealtimeActive,
    counts: {
      all: leads.length,
      urgent: urgentCount,
      planned: plannedCount,
    },
    refresh,
  };
}
