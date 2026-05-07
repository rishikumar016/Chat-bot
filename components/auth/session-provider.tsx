"use client"

import { useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { reset, setHydrated } from "@/lib/store/auth-slice"
import { getNewToken } from "@/lib/api-client"

/**
 * Runs ONCE on app bootstrap.
 * Tries to silently refresh the access token using the httpOnly refreshToken cookie.
 * On success, the token lands in Redux and `useGetUserQuery` will auto-fetch.
 * On failure, the auth slice is reset and the user is treated as logged out.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const ran = useRef(false)
  const isHydrated = useAppSelector((s) => s.auth.isHydrated)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (ran.current || isHydrated) return
    ran.current = true

    getNewToken()
      .catch(() => dispatch(reset()))
      .finally(() => dispatch(setHydrated(true)))
  }, [isHydrated, dispatch])

  return <>{children}</>
}
