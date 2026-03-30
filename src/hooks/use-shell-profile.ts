"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

type ShellProfile = {
  id: string;
  name?: string | null;
  role: "CLIENT" | "PROFESSIONAL";
  email: string;
};

type ShellProfileResponse = {
  user?: ShellProfile | null;
};

let profileRequest: Promise<ShellProfile | null> | null = null;

async function loadShellProfile(): Promise<ShellProfile | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ShellProfileResponse;
  return payload.user ?? null;
}

export function useShellProfile() {
  const profileResolved = useAuthStore((state) => state.profileResolved);
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const email = useAuthStore((state) => state.email);
  const name = useAuthStore((state) => state.name);
  const syncProfile = useAuthStore((state) => state.syncProfile);

  useEffect(() => {
    let active = true;

    if (profileResolved) {
      return () => {
        active = false;
      };
    }

    if (!profileRequest) {
      profileRequest = loadShellProfile().finally(() => {
        profileRequest = null;
      });
    }

    void profileRequest.then((profile) => {
      if (!active) {
        return;
      }

      if (!profile) {
        syncProfile(null);
        return;
      }

      syncProfile({
        userId: profile.id,
        role: profile.role,
        email: profile.email,
        name: profile.name,
      });
    });

    return () => {
      active = false;
    };
  }, [profileResolved, syncProfile]);

  if (!profileResolved) {
    return undefined;
  }

  if (!userId || !role || !email) {
    return null;
  }

  return {
    id: userId,
    role,
    email,
    name,
  };
}
