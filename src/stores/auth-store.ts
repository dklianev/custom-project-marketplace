"use client";

import { create } from "zustand";

type Role = "CLIENT" | "PROFESSIONAL";

type AuthState = {
  userId: string | null;
  role: Role | null;
  email: string | null;
  isAuthenticated: boolean;
  setSession: (payload: { userId: string; role: Role; email: string }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  email: null,
  isAuthenticated: false,
  setSession: ({ userId, role, email }) =>
    set({ userId, role, email, isAuthenticated: true }),
  clearSession: () =>
    set({ userId: null, role: null, email: null, isAuthenticated: false }),
}));
