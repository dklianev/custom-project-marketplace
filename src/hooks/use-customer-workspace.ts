"use client";

import { startTransition, useCallback, useEffect, useState } from "react";

type WorkspaceOffer = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  price: number;
  timeline: number;
  createdAt: string;
  featured: boolean;
  requestId: string;
  project: { id: string } | null;
  request: {
    id: string;
    title: string;
    budget: string | null;
    timeline: string | null;
    location: string | null;
  };
  professional: {
    id: string;
    name: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
  };
};

type WorkspaceProject = {
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
  professional: {
    id: string;
    name: string;
    verified: boolean;
    rating: number;
    reviewCount: number;
  };
  milestones: Array<{
    id: string;
    title: string;
    order: number;
    completed: boolean;
    completedAt: string | null;
  }>;
  payment: {
    id: string;
    total: number;
    amount: number;
    serviceFee: number;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED";
    invoiceNumber: string | null;
  } | null;
  review: { id: string } | null;
  offer: {
    id: string;
    price: number;
    timeline: number;
  } | null;
};

type OffersResponse = { offers: WorkspaceOffer[] };
type ProjectsResponse = { projects: WorkspaceProject[] };
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

export function useCustomerWorkspace() {
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [offers, setOffers] = useState<WorkspaceOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyWorkspaceData = useCallback((nextData: Awaited<ReturnType<typeof loadWorkspaceData>>) => {
    startTransition(() => {
      setProjects(nextData.projects);
      setOffers(nextData.offers);
      setError(null);
    });
  }, []);

  const refresh = useCallback(async () => {
    const nextData = await loadWorkspaceData();
    applyWorkspaceData(nextData);
  }, [applyWorkspaceData]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const nextData = await loadWorkspaceData();
        if (!cancelled) {
          applyWorkspaceData(nextData);
        }
      } catch (refreshError) {
        if (!cancelled) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Не успяхме да заредим работното пространство.",
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
  }, [applyWorkspaceData]);

  return {
    projects,
    offers,
    loading,
    error,
    refresh,
  };
}

export type { WorkspaceOffer, WorkspaceProject };
