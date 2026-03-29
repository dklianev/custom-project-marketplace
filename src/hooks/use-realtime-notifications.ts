"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createOptionalClient } from "@/lib/supabase/client";
import { useNotificationStore } from "@/stores/notification-store";

type NotificationItem = {
  id: string;
  title: string;
  unread: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
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

export function useRealtimeNotifications() {
  const supabase = useMemo(() => createOptionalClient(), []);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const replaceNotifications = useNotificationStore(
    (state) => state.replaceNotifications,
  );
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/notifications/unread", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to load notifications."),
      );
    }

    const payload = await readJson<NotificationsResponse>(response);
    replaceNotifications(payload?.notifications ?? []);
    if (typeof payload?.unreadCount === "number") {
      setUnreadCount(payload.unreadCount);
    }
  }, [replaceNotifications, setUnreadCount]);

  useEffect(() => {
    let cancelled = false;

    void refresh()
      .then(() => {
        if (!cancelled) {
          setError(null);
        }
      })
      .catch((refreshError) => {
        if (!cancelled) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to load notifications.",
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
  }, [refresh]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const handleRefresh = () => {
      void refresh().catch(() => {
        // Keep the last known count if a background refresh fails.
      });
    };

    const channel = supabase
      .channel("user:notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        handleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "offers" },
        handleRefresh,
      );

    channel.subscribe((status) => {
      setIsRealtimeActive(status === "SUBSCRIBED");
    });

    return () => {
      setIsRealtimeActive(false);
      void supabase.removeChannel(channel);
    };
  }, [refresh, supabase]);

  return {
    unreadCount,
    notifications,
    loading,
    error,
    isRealtimeActive,
    refresh,
  };
}
