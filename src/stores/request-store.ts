"use client";

import { create } from "zustand";

type RequestDraft = {
  description: string;
  area?: string;
  priorities: string[];
  specificNotes?: string;
  budget?: string;
  timeline?: string;
  location?: string;
};

type RequestState = {
  step: number;
  draft: RequestDraft;
  setStep: (step: number) => void;
  mergeDraft: (patch: Partial<RequestDraft>) => void;
  reset: () => void;
};

const initialDraft: RequestDraft = {
  description: "",
  priorities: [],
};

export const useRequestStore = create<RequestState>((set) => ({
  step: 1,
  draft: initialDraft,
  setStep: (step) => set({ step }),
  mergeDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ step: 1, draft: initialDraft }),
}));
