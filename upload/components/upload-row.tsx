"use client"

import { memo } from "react"
import Link from "next/link"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { Button } from "@/components/ui/button"
import { removeUploadAndBlob, selectUploadById } from "../slice"

interface Props {
  id: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function statusLabel(code: string, message?: string): string {
  switch (code) {
    case "password":
      return "Password-protected — not supported"
    case "corrupted":
      return "Corrupted file — could not be parsed"
    case "quota":
      return "Storage quota exceeded"
    case "io":
      return message || "Could not read the file"
    default:
      return message ? `Failed to process: ${message}` : "Failed to process"
  }
}

export const UploadRow = memo(function UploadRow({ id }: Props) {
  const dispatch = useAppDispatch()
  const upload = useAppSelector((s) => selectUploadById(s, id))
  if (!upload) return null

  const isReady = upload.status === "ready"
  const isError = upload.status === "error"
  const isWorking = upload.status === "queued" || upload.status === "parsing"

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="grid min-w-0 gap-1">
        <div className="truncate text-sm font-medium" title={upload.name}>
          {upload.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatSize(upload.size)}
          {upload.metadata?.pageCount
            ? ` · ${upload.metadata.pageCount} pages`
            : ""}
          {upload.metadata?.title ? ` · ${upload.metadata.title}` : ""}
        </div>
        {isError && upload.error && (
          <div className="text-xs text-destructive">
            {statusLabel(upload.error.code, upload.error.message)}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isWorking && (
          <span className="text-xs text-muted-foreground">Parsing…</span>
        )}
        {isReady && (
          <Button asChild size="sm">
            <Link href={`/documents/${upload.id}`}>Open</Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch(removeUploadAndBlob(upload.id))}
        >
          Remove
        </Button>
      </div>
    </div>
  )
})
