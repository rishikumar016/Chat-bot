"use client"

import { use } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// react-pdf + pdfjs + the virtualizer are heavy and browser-only.
// next/dynamic({ ssr: false }) keeps them out of the initial bundle and
// out of the server prerender path.
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
      <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/documents">← Back to documents</Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <PdfViewer documentId={id} />
      </div>
    </div>
  )
}
