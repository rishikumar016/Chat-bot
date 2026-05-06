"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth-store"
import { useUser } from "@/lib/auth/hooks"
import { LogoutButton } from "@/components/auth/logout-button"

function NavSkeleton() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <span className="h-4 w-32 animate-pulse rounded bg-muted" />
      <span className="h-8 w-20 animate-pulse rounded bg-muted" />
    </header>
  )
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: user, isLoading } = useUser()

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace("/sign-in")
    }
  }, [isHydrated, accessToken, router])

  if (!isHydrated || (accessToken && isLoading)) {
    return (
      <div className="flex min-h-svh flex-col">
        <NavSkeleton />
        <main className="flex-1 p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </main>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="text-sm font-medium">
          {user.firstName} {user.lastName}
        </span>
        <LogoutButton />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
