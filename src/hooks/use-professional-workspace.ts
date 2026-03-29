"use client";

import { useCallback, useEffect, useState } from "react";

type ProfessionalOffer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  price: number;
  timeline: number;
  createdAt: string;
  requestId: string;
  project: { id: string } | null;
  request: {
    id: string;
    title: string;
    budget: string | null;
    timeline: string | null;
    location: string | null;
  };
};

type ProfessionalProject = {
  id: string;
  title: string;
  status:
    | "CREATED"
    | "REVIEW"
    | "DESIGN"
    | "APPROVAL"
    | "FINALIZATION"
    | "COMPLETED"
    | "CANCELLED";
  progress: number;
  deadline: string | null;
  updatedAt: string;
  request: {
    id: string;
    title: string;
    budget: string | null;
    timeline: string | null;
    location: string | null;
  };
  client: {
    id: string;
    name: string;
  };
  payment: {
    id: string;
    total: number;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
  } | null;
  review: { id: string } | null;
};

type OffersResponse = { offers: ProfessionalOffer[] };
type ProjectsResponse = { projects: ProfessionalProject[] };
type ErrorResponse = { error?: string };

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

async function loadWorkspaceData() {
  const [projectsResponse, offersResponse] = await Promise.all([
    fetch("/api/projects", { cache: "no-store" }),
    fetch("/api/offers", { cache: "no-store" }),
  ]);

  if (!projectsResponse.ok) {
    throw new Error(await readErrorMessage(projectsResponse, "Не успяхме да заредим проектите."));
  }

  if (!offersResponse.ok) {
    throw new Error(await readErrorMessage(offersResponse, "Не успяхме да заредим офертите."));
  }

  const [projectsPayload, offersPayload] = await Promise.all([
    readJson<ProjectsResponse>(projectsResponse),
    readJson<OffersResponse>(offersResponse),
  ]);

  return {
    projects: projectsPayload?.projects ?? [],
    offers: offersPayload?.offers ?? [],
  };
}

export function useProfessionalWorkspace() {
  const [projects, setProjects] = useState<ProfessionalProject[]>([]);
  const [offers, setOffers] = useState<ProfessionalOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const nextData = await loadWorkspaceData();
    setProjects(nextData.projects);
    setOffers(nextData.offers);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const nextData = await loadWorkspaceData();
        if (!cancelled) {
          setProjects(nextData.projects);
          setOffers(nextData.offers);
          setError(null);
        }
      } catch (refreshError) {
        if (!cancelled) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Не успяхме да заредим професионалното табло.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return {
    projects,
    offers,
    loading,
    error,
    refresh,
  };
}

export type { ProfessionalOffer, ProfessionalProject };
