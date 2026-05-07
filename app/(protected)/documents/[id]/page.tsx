"use client"

import { use } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// The viewer pulls in react-pdf + pdfjs + the virtualizer — keep them out
// of the initial bundle for everything else.
const PdfViewer = dynamic(() => import("@/components/viewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
      Loading viewer…
    </div>
  ),
})

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentViewerPage({ params }: PageProps) {
  const { id } = use(params)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b bg-background px-4 py-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/documents">← Back to documents</Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <PdfViewer documentId={id} />
      </div>
    </div>
  )
}
