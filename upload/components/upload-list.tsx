"use client"

import { useAppSelector } from "@/lib/store/hooks"
import { selectUploadIds } from "../slice"
import { UploadRow } from "./upload-row"

export function UploadList() {
  const ids = useAppSelector(selectUploadIds)

  if (ids.length === 0) {
    return (
      <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No documents yet — upload a PDF to get started.
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      {ids.map((id) => (
        <UploadRow key={id} id={String(id)} />
      ))}
    </div>
  )
}
