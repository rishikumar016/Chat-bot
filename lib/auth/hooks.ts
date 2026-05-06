"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import type { User } from "./types"

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
}

// ── Raw API calls ─────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginData) =>
    apiClient.post<{ accessToken: string }>("/auth/login", data),

  register: (data: RegisterData) =>
    apiClient.post<{ message: string }>("/auth/register", data),

  logout: () => apiClient.get("/auth/logout"),

  getUser: () => apiClient.get<{ user: User }>("/auth/get-user"),
}

// ── Query keys ────────────────────────────────────────────────────────
export const authKeys = {
  user: ["auth", "user"] as const,
}

// ── Hooks ─────────────────────────────────────────────────────────────
export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginData) => authApi.login(data),
    onSuccess: async (response) => {
      setAccessToken(response.data.accessToken)
      // refetch the user query so layout updates immediately
      await queryClient.invalidateQueries({ queryKey: authKeys.user })
      router.push("/dashboard")
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
  })
}

export function useLogout() {
  const reset = useAuthStore((s) => s.reset)
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      reset()
      queryClient.clear()
      router.push("/sign-in")
    },
  })
}

// useUser is a query — it caches, dedupes, refetches.
// Enabled only when we have an access token (after session bootstrap).
export function useUser() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      const res = await authApi.getUser()
      setUser(res.data.user)
      return res.data.user
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 min — user rarely changes
  })
}
