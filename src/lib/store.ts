"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  userId: string;
  twitterId: string;
  walletAddress: string;
  createdAt: string;
}

interface SessionState {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "ritual-mining-session" }
  )
);
