// Pure JSX — usable from both server and client trees. Used as the static
// shell during PPR prerender (see app/dashboard/layout.tsx).
export function NavSkeleton() {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r p-4 md:flex">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          <span className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-2">
          <span className="h-8 w-full animate-pulse rounded bg-muted" />
          <span className="h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      </aside>
      <div className="flex min-h-svh flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <span className="h-7 w-7 animate-pulse rounded bg-muted" />
        </header>
        <main className="flex min-h-0 flex-1 flex-col p-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </main>
      </div>
    </div>
  )
}
