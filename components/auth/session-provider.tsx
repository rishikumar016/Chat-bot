"use client"

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { getNewToken } from "@/lib/api-client"

/**
 * Runs ONCE on app bootstrap.
 * Tries to silently refresh the access token using the httpOnly refreshToken cookie.
 * On success, the token lands in Zustand and `useUser` will auto-fetch.
 * On failure, the store is reset and the user is treated as logged out.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const ran = useRef(false)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const setHydrated = useAuthStore((s) => s.setHydrated)
  const reset = useAuthStore((s) => s.reset)

  useEffect(() => {
    if (ran.current || isHydrated) return
    ran.current = true

    getNewToken()
      .catch(() => reset())
      .finally(() => setHydrated(true))
  }, [isHydrated, setHydrated, reset])

  return <>{children}</>
}
