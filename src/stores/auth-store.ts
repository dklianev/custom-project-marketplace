"use client";

import { create } from "zustand";

type Role = "CLIENT" | "PROFESSIONAL";

type AuthState = {
  userId: string | null;
  role: Role | null;
  email: string | null;
  name: string | null;
  isAuthenticated: boolean;
  profileResolved: boolean;
  setSession: (payload: {
    userId: string;
    role: Role;
    email: string;
    name?: string | null;
  }) => void;
  syncProfile: (payload: {
    userId: string;
    role: Role;
    email: string;
    name?: string | null;
  } | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  email: null,
  name: null,
  isAuthenticated: false,
  profileResolved: false,
  setSession: ({ userId, role, email, name }) =>
    set({
      userId,
      role,
      email,
      name: name?.trim() || null,
      isAuthenticated: true,
      profileResolved: true,
    }),
  syncProfile: (payload) =>
    set({
      userId: payload?.userId ?? null,
      role: payload?.role ?? null,
      email: payload?.email ?? null,
      name: payload?.name?.trim() || null,
      isAuthenticated: Boolean(payload),
      profileResolved: true,
    }),
  clearSession: () =>
    set({
      userId: null,
      role: null,
      email: null,
      name: null,
      isAuthenticated: false,
      profileResolved: true,
    }),
}));
