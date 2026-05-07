"use client"

import { useMemo } from "react"
import { FileTextIcon, PaperclipIcon } from "lucide-react"

import { useAppSelector } from "@/lib/store/hooks"
import { selectAllUploads } from "@/upload/slice"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ChatAttachment } from "../types"

export function AttachmentPicker({
  onPick,
}: {
  onPick: (a: ChatAttachment) => void
}) {
  const uploads = useAppSelector(selectAllUploads)
  const ready = useMemo(
    () => uploads.filter((u) => u.status === "ready" && u.metadata),
    [uploads],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Attach a document"
        >
          <PaperclipIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Attach a document</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ready.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">
              Upload a PDF in Documents first
            </span>
          </DropdownMenuItem>
        ) : (
          ready.map((u) => (
            <DropdownMenuItem
              key={u.id}
              onSelect={() =>
                onPick({
                  id: u.id,
                  title: u.metadata!.title || u.name,
                  pageCount: u.metadata!.pageCount,
                })
              }
            >
              <FileTextIcon className="mr-2 size-4 shrink-0 text-muted-foreground" />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm">
                  {u.metadata?.title || u.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {u.metadata?.pageCount} pages
                </span>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
