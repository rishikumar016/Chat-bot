import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { User } from "@/types/auth-types"

export interface AuthState {
  accessToken: string | null
  user: User | null
  isHydrated: boolean
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isHydrated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
    },
    setHydrated(state, action: PayloadAction<boolean>) {
      state.isHydrated = action.payload
    },
    reset(state) {
      state.accessToken = null
      state.user = null
      state.isHydrated = true
    },
  },
})

export const { setAccessToken, setUser, setHydrated, reset } = authSlice.actions
export default authSlice.reducer
