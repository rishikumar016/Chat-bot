export interface User {
  _id: string
  firstName: string
  lastName: string
  email: string
}

export interface AuthState {
  accessToken: string | null
  user: User | null
  isHydrated: boolean
}

export interface AuthActions {
  setAccessToken: (token: string) => void
  setUser: (user: User) => void
  reset: () => void
  setHydrated: (v: boolean) => void
}

export interface ActionResult {
  error?: string
  success?: boolean
}
