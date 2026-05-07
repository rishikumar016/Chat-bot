import { Suspense } from "react"
import { NavSkeleton } from "@/components/auth/nav-skeleton"
import { ProtectedShell } from "@/components/auth/protected-shell"

// Server Component. The dynamic auth-gated tree (RTK Query, redux selectors,
// useEffect-driven redirect) lives inside <ProtectedShell>; <Suspense>
// gives Next 16 PPR a fallback to prerender so internals like Date.now()
// inside RTK Query don't break static generation.
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<NavSkeleton />}>
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  )
}
