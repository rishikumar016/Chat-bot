"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { useGetUserQuery } from "@/lib/store/auth-api"
import { LogoutButton } from "@/components/auth/logout-button"
import { NavSkeleton } from "@/components/auth/nav-skeleton"

// Dynamic auth-gated subtree. Sits behind a <Suspense> in the parent server
// layout so PPR can prerender a static shell — RTK Query's internal
// Date.now() calls are then safe under that boundary.
export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isHydrated = useAppSelector((s) => s.auth.isHydrated)
  const accessToken = useAppSelector((s) => s.auth.accessToken)

  const { data: user, isLoading } = useGetUserQuery(undefined, {
    skip: !accessToken,
  })

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace("/sign-in")
    }
  }, [isHydrated, accessToken, router])

  if (!isHydrated || (accessToken && isLoading)) {
    return <NavSkeleton />
  }

  if (!user) return null

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/documents" className="text-sm font-medium">
          {user.firstName} {user.lastName}
        </Link>
        <LogoutButton />
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
