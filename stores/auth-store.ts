import { create } from "zustand"
import type { AuthState, AuthActions } from "@/lib/auth/types"

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isHydrated: false,
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  ...initialState,

  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setHydrated: (v) => set({ isHydrated: v }),

  reset: () => set({ ...initialState, isHydrated: true }),
}))
