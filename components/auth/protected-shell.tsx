"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { useGetUserQuery } from "@/lib/store/auth-api"
import { AppSidebar } from "@/components/auth/app-sidebar"
import { NavSkeleton } from "@/components/auth/nav-skeleton"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UploadsHydrator } from "@/upload/components/uploads-hydrator"

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
    <TooltipProvider>
      <SidebarProvider>
        <UploadsHydrator />
        <AppSidebar user={user} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
          </header>
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
