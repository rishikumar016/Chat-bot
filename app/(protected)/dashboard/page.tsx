export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        You are authenticated. Upload a document to get started.
      </p>
    </div>
  )
}
