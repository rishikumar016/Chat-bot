"use client"

import { useEffect, useState } from "react"
import { Document } from "react-pdf"

import "@/lib/pdf/pdfjs-config"
import { getPdfBlob } from "@/upload/storage"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { selectUploadById } from "@/upload/slice"
import { viewerActions } from "@/lib/store/viewer-slice"
import { Toolbar } from "./toolbar"
import { Viewport } from "./viewport"

interface Props {
  documentId: string
}

interface DocumentSource {
  data: Uint8Array
}

export default function PdfViewer({ documentId }: Props) {
  const dispatch = useAppDispatch()
  const upload = useAppSelector((s) => selectUploadById(s, documentId))

  const [file, setFile] = useState<DocumentSource | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(upload?.metadata?.pageCount ?? 0)

  // Reset viewer UI state when switching documents.
  useEffect(() => {
    dispatch(viewerActions.resetViewer())
  }, [documentId, dispatch])

  // Pull the blob bytes from IndexedDB. Hand them to <Document> as a stable
  // { data: Uint8Array } reference so react-pdf doesn't reload on each render.
  useEffect(() => {
    let cancelled = false
    setFile(null)
    setLoadError(null)
    getPdfBlob(documentId)
      .then(async (blob) => {
        if (cancelled) return
        if (!blob) {
          setLoadError("Document not found in local storage")
          return
        }
        const buffer = await blob.arrayBuffer()
        if (cancelled) return
        setFile({ data: new Uint8Array(buffer) })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(
          err instanceof Error ? err.message : "Failed to load document",
        )
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  if (loadError) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="rounded-md bg-destructive/10 px-6 py-4 text-sm text-destructive">
          {loadError}
        </div>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
        Loading document…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Document
        file={file}
        onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
        onLoadError={(err) =>
          setLoadError(err.message ?? "Failed to render PDF")
        }
        loading={
          <div className="grid h-full place-items-center p-6 text-sm text-muted-foreground">
            Decoding PDF…
          </div>
        }
        className="flex h-full flex-col"
      >
        <Toolbar numPages={numPages} />
        <Viewport documentId={documentId} numPages={numPages} />
      </Document>
    </div>
  )
}
