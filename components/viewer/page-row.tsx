"use client"

import { memo } from "react"
import { Page } from "react-pdf"

interface Props {
  pageNumber: number
  scale: number
  rotation: number
}

// Memoized so siblings re-render only when their own scalar props change.
// Text + annotation layers disabled by default — re-enable when needed for
// search; rendering them per page is the dominant render cost.
export const PageRow = memo(function PageRow({
  pageNumber,
  scale,
  rotation,
}: Props) {
  return (
    <div className="mx-auto w-fit py-2">
      <Page
        pageNumber={pageNumber}
        scale={scale}
        rotate={rotation}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={
          <div className="h-[1100px] w-[850px] animate-pulse rounded-md bg-muted" />
        }
        className="shadow-md"
      />
    </div>
  )
})
