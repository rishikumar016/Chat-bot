import { Suspense } from "react"

function AuthSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  )
}

// Forms here use RTK Query mutations — those call Date.now() internally
// during render, which Next 16 PPR flags unless wrapped in <Suspense>.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<AuthSkeleton />}>{children}</Suspense>
      </div>
    </div>
  )
}
