"use client"

import { useAppSelector } from "@/lib/store/hooks"
import { selectAllUploads } from "@/upload/slice"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const NONE_VALUE = "__none__"

export function DocumentContextSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const uploads = useAppSelector(selectAllUploads)
  const ready = uploads.filter((u) => u.status === "ready")

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger className="h-8 w-full max-w-xs">
        <SelectValue placeholder="No document selected" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>
          <span className="text-muted-foreground">No document (plain chat)</span>
        </SelectItem>
        {ready.length === 0 ? (
          <SelectItem value="__placeholder__" disabled>
            <span className="text-muted-foreground">
              Upload a PDF in Documents first
            </span>
          </SelectItem>
        ) : (
          ready.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="truncate">
                {u.metadata?.title || u.name}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
