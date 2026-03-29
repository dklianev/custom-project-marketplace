"use client";

import { create } from "zustand";

export type ChatMessageSender = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  read: boolean;
  sender?: ChatMessageSender | null;
};

type ChatState = {
  projectId: string | null;
  messages: ChatMessage[];
  typingUserIds: string[];
  onlineUserIds: string[];
  setProject: (projectId: string | null) => void;
  replaceMessages: (messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage) => void;
  upsertMessage: (message: ChatMessage) => void;
  markMessagesRead: (messageIds: string[]) => void;
  setTypingUsers: (userIds: string[]) => void;
  setOnlineUsers: (userIds: string[]) => void;
  reset: () => void;
};

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export const useChatStore = create<ChatState>((set) => ({
  projectId: null,
  messages: [],
  typingUserIds: [],
  onlineUserIds: [],
  setProject: (projectId) => set({ projectId }),
  replaceMessages: (messages) => set({ messages: sortMessages(messages) }),
  appendMessage: (message) =>
    set((state) => ({ messages: sortMessages([...state.messages, message]) })),
  upsertMessage: (message) =>
    set((state) => {
      const nextMessages = state.messages.some((item) => item.id === message.id)
        ? state.messages.map((item) => (item.id === message.id ? message : item))
        : [...state.messages, message];

      return {
        messages: sortMessages(nextMessages),
      };
    }),
  markMessagesRead: (messageIds) =>
    set((state) => ({
      messages: state.messages.map((item) =>
        messageIds.includes(item.id)
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    })),
  setTypingUsers: (typingUserIds) => set({ typingUserIds }),
  setOnlineUsers: (onlineUserIds) => set({ onlineUserIds }),
  reset: () =>
    set({
      projectId: null,
      messages: [],
      typingUserIds: [],
      onlineUserIds: [],
    }),
}));
