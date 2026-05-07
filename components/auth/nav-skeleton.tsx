// Pure JSX — usable from both server and client trees. Used as the static
// shell during PPR prerender (see app/(protected)/layout.tsx).
export function NavSkeleton() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="h-4 w-32 animate-pulse rounded bg-muted" />
        <span className="h-8 w-20 animate-pulse rounded bg-muted" />
      </header>
      <main className="flex min-h-0 flex-1 flex-col p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </main>
    </div>
  )
}
