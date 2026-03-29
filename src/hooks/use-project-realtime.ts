"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createOptionalClient } from "@/lib/supabase/client";
import { useChatStore, type ChatMessage } from "@/stores/chat-store";

type ProjectUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  email?: string | null;
  role?: "CLIENT" | "PROFESSIONAL";
};

type ProjectMilestone = {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
};

type ProjectPayment = {
  id: string;
  amount: number;
  serviceFee: number;
  total: number;
  currency: string;
  status: string;
  paidAmount: number;
  remainingAmount: number | null;
};

export type RealtimeProject = {
  id: string;
  title: string;
  status: string;
  progress: number;
  clientId: string;
  professionalId: string;
  client: ProjectUser;
  professional: ProjectUser;
  milestones: ProjectMilestone[];
  payment: ProjectPayment | null;
};

type AuthUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "CLIENT" | "PROFESSIONAL";
};

type ProjectResponse = {
  project: RealtimeProject;
};

type MessagesResponse = {
  messages: ChatMessage[];
};

type AuthResponse = {
  user: AuthUser;
};

type ErrorResponse = {
  error?: string;
};

type RealtimeRow = {
  id?: string;
  projectId?: string;
};

type PresencePayload = {
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: "CLIENT" | "PROFESSIONAL";
  onlineAt?: string;
};

type TypingPayload = {
  userId?: string;
  isTyping?: boolean;
};

function normalizeMessage(message: ChatMessage): ChatMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    text: message.text,
    imageUrl: message.imageUrl ?? null,
    createdAt: message.createdAt,
    read: message.read,
    sender: message.sender
      ? {
          id: message.sender.id,
          name: message.sender.name ?? null,
          avatarUrl: message.sender.avatarUrl ?? null,
        }
      : null,
  };
}

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

export function useProjectRealtime(projectId: string) {
  const supabase = useMemo(() => createOptionalClient(), []);
  const activeProjectId = useChatStore((state) => state.projectId);
  const messages = useChatStore((state) =>
    state.projectId === projectId ? state.messages : [],
  );
  const setProjectId = useChatStore((state) => state.setProject);
  const replaceMessages = useChatStore((state) => state.replaceMessages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const markMessagesRead = useChatStore((state) => state.markMessagesRead);
  const typingUserIds = useChatStore((state) =>
    state.projectId === projectId ? state.typingUserIds : [],
  );
  const onlineUserIds = useChatStore((state) =>
    state.projectId === projectId ? state.onlineUserIds : [],
  );
  const setTypingUsers = useChatStore((state) => state.setTypingUsers);
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const resetStore = useChatStore((state) => state.reset);
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutsRef = useRef<Map<string, number>>(new Map());

  const [project, setProject] = useState<RealtimeProject | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const loadProject = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to load project."));
    }

    const payload = await readJson<ProjectResponse>(response);
    if (!payload?.project) {
      throw new Error("Project response is missing project data.");
    }

    return payload.project;
  }, [projectId]);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/messages`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, "Unable to load messages."),
      );
    }

    const payload = await readJson<MessagesResponse>(response);
    return (payload?.messages ?? []).map(normalizeMessage);
  }, [projectId]);

  const loadCurrentUser = useCallback(async () => {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, "Unable to load user."));
    }

    const payload = await readJson<AuthResponse>(response);
    if (!payload?.user) {
      throw new Error("User response is missing user data.");
    }

    return payload.user;
  }, []);

  const syncOnlineUsers = useCallback(
    (channel: RealtimeChannel) => {
      const presenceState = channel.presenceState() as Record<
        string,
        PresencePayload[]
      >;

      const nextOnlineUsers = Array.from(
        new Set(
          Object.values(presenceState)
            .flat()
            .map((presence) => presence.userId)
            .filter(
              (userId): userId is string =>
                Boolean(userId) && userId !== currentUser?.id,
            ),
        ),
      );

      setOnlineUsers(nextOnlineUsers);
      setTypingUsers(
        useChatStore
          .getState()
          .typingUserIds.filter((userId) => nextOnlineUsers.includes(userId)),
      );
    },
    [currentUser?.id, setOnlineUsers, setTypingUsers],
  );

  const setRemoteUserTyping = useCallback(
    (userId: string, isTyping: boolean) => {
      const nextTypingUsers = new Set(useChatStore.getState().typingUserIds);

      if (isTyping) {
        nextTypingUsers.add(userId);
      } else {
        nextTypingUsers.delete(userId);
      }

      setTypingUsers(Array.from(nextTypingUsers));
    },
    [setTypingUsers],
  );

  const clearLocalTypingTimeout = useCallback(() => {
    if (stopTypingTimeoutRef.current !== null) {
      window.clearTimeout(stopTypingTimeoutRef.current);
      stopTypingTimeoutRef.current = null;
    }
  }, []);

  const announceTyping = useCallback(
    async (isTyping: boolean) => {
      if (!channelRef.current || !currentUser) {
        return;
      }

      if (!isTyping && !localTypingRef.current) {
        clearLocalTypingTimeout();
        return;
      }

      if (isTyping === localTypingRef.current) {
        clearLocalTypingTimeout();

        if (isTyping) {
          stopTypingTimeoutRef.current = window.setTimeout(() => {
            void announceTyping(false);
          }, 1400);
        }
        return;
      }

      localTypingRef.current = isTyping;

      await channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: {
          userId: currentUser.id,
          isTyping,
        } satisfies TypingPayload,
      });

      clearLocalTypingTimeout();

      if (isTyping) {
        stopTypingTimeoutRef.current = window.setTimeout(() => {
          void announceTyping(false);
        }, 1400);
      }
    },
    [clearLocalTypingTimeout, currentUser],
  );

  const refreshProject = useCallback(async () => {
    const nextProject = await loadProject();
    setProject(nextProject);
    return nextProject;
  }, [loadProject]);

  const refreshMessages = useCallback(async () => {
    const nextMessages = await loadMessages();
    replaceMessages(nextMessages);
    return nextMessages;
  }, [loadMessages, replaceMessages]);

  const refresh = useCallback(async () => {
    const [projectResult, messageResult, authResult] = await Promise.allSettled([
      loadProject(),
      loadMessages(),
      loadCurrentUser(),
    ]);

    if (projectResult.status === "fulfilled") {
      setProject(projectResult.value);
    }

    if (messageResult.status === "fulfilled") {
      replaceMessages(messageResult.value);
    }

    if (authResult.status === "fulfilled") {
      setCurrentUser(authResult.value);
    }

    if (
      projectResult.status === "rejected" &&
      messageResult.status === "rejected"
    ) {
      const reason = projectResult.reason;
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load live project data.",
      );
    } else {
      setError(null);
    }
  }, [loadCurrentUser, loadMessages, loadProject, replaceMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) {
        return false;
      }

      setSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: value }),
        });

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to send message."),
          );
        }

        const payload = await readJson<{ message?: ChatMessage }>(response);
        if (payload?.message) {
          upsertMessage(normalizeMessage(payload.message));
        } else {
          await refreshMessages();
        }

        await announceTyping(false);

        return true;
      } catch (sendError) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Unable to send message.",
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [announceTyping, projectId, refreshMessages, upsertMessage],
  );

  const markIncomingMessagesRead = useCallback(
    async (messageIds: string[]) => {
      const nextIds = messageIds.filter(
        (messageId) => !pendingReadIdsRef.current.has(messageId),
      );

      if (nextIds.length === 0) {
        return;
      }

      nextIds.forEach((messageId) => pendingReadIdsRef.current.add(messageId));

      try {
        const response = await fetch(`/api/projects/${projectId}/messages/read`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(response, "Unable to mark messages as read."),
          );
        }

        const payload = await readJson<{ messageIds?: string[] }>(response);
        const readIds = payload?.messageIds?.length ? payload.messageIds : nextIds;
        markMessagesRead(readIds);
      } catch (markError) {
        setError(
          markError instanceof Error
            ? markError.message
            : "Unable to mark messages as read.",
        );
      } finally {
        nextIds.forEach((messageId) => pendingReadIdsRef.current.delete(messageId));
      }
    },
    [markMessagesRead, projectId],
  );

  useEffect(() => {
    let cancelled = false;

    setProjectId(projectId);
    replaceMessages([]);
    setTypingUsers([]);
    setOnlineUsers([]);
    setProject(null);
    setCurrentUser(null);
    setError(null);
    setLoading(true);

    void refresh().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (useChatStore.getState().projectId === projectId) {
        resetStore();
      }
    };
  }, [
    projectId,
    refresh,
    replaceMessages,
    resetStore,
    setOnlineUsers,
    setProjectId,
    setTypingUsers,
  ]);

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const channel = supabase
      .channel(`project:${projectId}:messages`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: {
            key: currentUser.id,
          },
        },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = ((payload.new ?? payload.old) as RealtimeRow | null) ?? null;
          if (row?.projectId !== projectId) {
            return;
          }

          void refreshMessages();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones" },
        (payload) => {
          const row = ((payload.new ?? payload.old) as RealtimeRow | null) ?? null;
          if (row?.projectId !== projectId) {
            return;
          }

          void refreshProject();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        (payload) => {
          const row = (payload.new as RealtimeRow | null) ?? null;
          if (row?.id !== projectId) {
            return;
          }

          void refreshProject();
        },
      )
      .on("presence", { event: "sync" }, () => {
        syncOnlineUsers(channel);
      })
      .on("presence", { event: "join" }, () => {
        syncOnlineUsers(channel);
      })
      .on("presence", { event: "leave" }, () => {
        syncOnlineUsers(channel);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const typingPayload = payload as TypingPayload;
        const userId = typingPayload.userId;

        if (!userId || userId === currentUser.id) {
          return;
        }

        const existingTimeout = remoteTypingTimeoutsRef.current.get(userId);
        if (existingTimeout !== undefined) {
          window.clearTimeout(existingTimeout);
          remoteTypingTimeoutsRef.current.delete(userId);
        }

        if (typingPayload.isTyping) {
          setRemoteUserTyping(userId, true);

          const timeoutId = window.setTimeout(() => {
            remoteTypingTimeoutsRef.current.delete(userId);
            setRemoteUserTyping(userId, false);
          }, 1800);

          remoteTypingTimeoutsRef.current.set(userId, timeoutId);
          return;
        }

        setRemoteUserTyping(userId, false);
      });

    channelRef.current = channel;
    const remoteTypingTimeouts = remoteTypingTimeoutsRef.current;

    channel.subscribe(async (status) => {
      setIsRealtimeActive(status === "SUBSCRIBED");

      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
          role: currentUser.role,
          onlineAt: new Date().toISOString(),
        } satisfies PresencePayload);
      }
    });

    return () => {
      channelRef.current = null;
      setIsRealtimeActive(false);
      setTypingUsers([]);
      setOnlineUsers([]);
      remoteTypingTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      remoteTypingTimeouts.clear();
      clearLocalTypingTimeout();
      localTypingRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [
    clearLocalTypingTimeout,
    currentUser,
    projectId,
    refreshMessages,
    refreshProject,
    setOnlineUsers,
    setRemoteUserTyping,
    setTypingUsers,
    supabase,
    syncOnlineUsers,
  ]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const unreadIncomingIds = messages
      .filter((message) => message.senderId !== currentUser.id && !message.read)
      .map((message) => message.id);

    if (unreadIncomingIds.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void markIncomingMessagesRead(unreadIncomingIds);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentUser, markIncomingMessagesRead, messages]);

  return {
    project,
    messages,
    currentUser,
    loading,
    sending,
    error,
    isRealtimeActive,
    hasStoreProject: activeProjectId === projectId,
    typingUserIds,
    onlineUserIds,
    refresh,
    sendMessage,
    announceTyping,
  };
}
