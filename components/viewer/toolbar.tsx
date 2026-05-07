"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  selectCurrentPage,
  selectRotation,
  selectScale,
  viewerActions,
} from "@/lib/store/viewer-slice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  numPages: number
}

const ZOOM_STEP = 0.25

export function Toolbar({ numPages }: Props) {
  const dispatch = useAppDispatch()
  const currentPage = useAppSelector(selectCurrentPage)
  const scale = useAppSelector(selectScale)
  const rotation = useAppSelector(selectRotation)

  const [pageInput, setPageInput] = useState(String(currentPage))

  // Keep the local input in sync when scrolling updates the page.
  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  function jumpTo(n: number) {
    if (Number.isNaN(n)) return
    const target = Math.max(1, Math.min(numPages || 1, Math.floor(n)))
    dispatch(viewerActions.requestJump(target))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => jumpTo(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Prev
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => jumpTo(currentPage + 1)}
        disabled={!numPages || currentPage >= numPages}
      >
        Next
      </Button>

      <div className="flex items-center gap-1 text-sm">
        <Input
          type="number"
          min={1}
          max={numPages || undefined}
          className="w-16"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={() => jumpTo(parseInt(pageInput, 10))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
              jumpTo(parseInt(pageInput, 10))
            }
          }}
        />
        <span className="text-muted-foreground">/ {numPages || "—"}</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch(viewerActions.setScale(scale - ZOOM_STEP))}
          aria-label="Zoom out"
        >
          −
        </Button>
        <span className="w-12 text-center text-sm tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch(viewerActions.setScale(scale + ZOOM_STEP))}
          aria-label="Zoom in"
        >
          +
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch(viewerActions.setRotation(rotation + 90))}
          aria-label="Rotate"
        >
          ↻
        </Button>
      </div>
    </div>
  )
}
