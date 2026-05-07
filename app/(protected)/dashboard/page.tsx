import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <div className="grid gap-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        You are authenticated. Upload a document to get started.
      </p>
      <Button asChild className="w-fit">
        <Link href="/documents">Go to documents</Link>
      </Button>
    </div>
  )
}
