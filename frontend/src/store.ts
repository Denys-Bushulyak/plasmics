import { create } from "zustand";
import {
  CURRENT_VALUE_URL,
  DECREMENT_URL,
  INCREMENT_URL,
  MAX_VALUE,
  MIN_VALUE,
} from "./constrains";

interface CounterStore {
  value: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  fetchCurrent: () => Promise<void>;
}

export const useCounterStore = create<CounterStore>((set, get) => ({
  value: MIN_VALUE,
  isLoading: false,
  error: null,

  increment: async () => {
    const { value: current } = get();

    const previousValue = current;

    // Optimistic update
    set({
      value: Math.min(current + 1, MAX_VALUE),
    });
    set({ isLoading: true });

    try {
      const response = await fetch(INCREMENT_URL, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to increment");

      const data = await response.json();
      set({ value: data.value, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        value: previousValue,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  decrement: async () => {
    const { value: current } = get();
    const previousValue = current;

    // Optimistic update
    set({ value: Math.max(current - 1, MIN_VALUE) });
    set({ isLoading: true });

    try {
      const response = await fetch(DECREMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to decrement");

      const data = await response.json();
      set({ value: data.value, error: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        value: previousValue,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCurrent: async () => {
    set({ isLoading: true });

    try {
      const response = await fetch(CURRENT_VALUE_URL, {
        method: "GET",
      });

      if (!response.ok) throw new Error("Failed to fetch counter");

      const data = await response.json();
      set({ value: data.value, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
