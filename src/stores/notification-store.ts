"use client";

import { create } from "zustand";

type NotificationItem = {
  id: string;
  title: string;
  unread: boolean;
  createdAt: string;
};

type NotificationState = {
  unreadCount: number;
  notifications: NotificationItem[];
  replaceNotifications: (notifications: NotificationItem[]) => void;
  setUnreadCount: (unreadCount: number) => void;
  upsertNotification: (notification: NotificationItem) => void;
  markAllRead: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],
  replaceNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((item) => item.unread).length,
    }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  upsertNotification: (notification) =>
    set((state) => {
      const notifications = state.notifications.some(
        (item) => item.id === notification.id,
      )
        ? state.notifications.map((item) =>
            item.id === notification.id ? notification : item,
          )
        : [notification, ...state.notifications];

      return {
        notifications,
        unreadCount: notifications.filter((item) => item.unread).length,
      };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        unread: false,
      })),
      unreadCount: 0,
    })),
}));
