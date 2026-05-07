"use client"

import { useEffect, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  selectPendingJump,
  selectRotation,
  selectScale,
  viewerActions,
} from "@/lib/store/viewer-slice"
import { selectUploadById } from "@/upload/slice"
import { PageRow } from "./page-row"

interface Props {
  documentId: string
  numPages: number
}

const FALLBACK_HEIGHT = 1100
const FALLBACK_WIDTH = 850
const PAGE_GAP = 16

export function Viewport({ documentId, numPages }: Props) {
  const dispatch = useAppDispatch()
  const upload = useAppSelector((s) => selectUploadById(s, documentId))
  const scale = useAppSelector(selectScale)
  const rotation = useAppSelector(selectRotation)
  const pendingJump = useAppSelector(selectPendingJump)

  const parentRef = useRef<HTMLDivElement>(null)
  const baseDims = upload?.metadata?.pageDims ?? []

  const virtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      // Use sampled dim if available, otherwise the last sampled one.
      const sample = baseDims[i] ?? baseDims[baseDims.length - 1]
      const baseWidth = sample?.width ?? FALLBACK_WIDTH
      const baseHeight = sample?.height ?? FALLBACK_HEIGHT
      const isRotated = rotation % 180 !== 0
      const h = isRotated ? baseWidth : baseHeight
      return h * scale + PAGE_GAP
    },
    overscan: 2,
    measureElement: (el) => el.getBoundingClientRect().height,
    getItemKey: (index) => `${documentId}:${index}`,
  })

  // Re-measure when zoom/rotation change so estimates regenerate.
  useEffect(() => {
    virtualizer.measure()
  }, [scale, rotation, virtualizer])

  // Honor toolbar jump requests, then clear the request.
  useEffect(() => {
    if (pendingJump == null) return
    virtualizer.scrollToIndex(pendingJump - 1, { align: "start" })
    dispatch(viewerActions.clearJump())
  }, [pendingJump, virtualizer, dispatch])

  // Scroll-derived current page (rAF-throttled to keep the main thread free).
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    let rafId: number | null = null
    let lastReported = -1
    const onScroll = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const items = virtualizer.getVirtualItems()
        if (items.length === 0) return
        // First item that's at least partially past the top of the scroll
        // viewport — that's the "current" page.
        const scrollTop = el.scrollTop
        const top = items.find((i) => i.start + i.size > scrollTop) ?? items[0]
        const page = top.index + 1
        if (page !== lastReported) {
          lastReported = page
          dispatch(viewerActions.setCurrentPage(page))
        }
      })
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [virtualizer, dispatch])

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto bg-muted/40"
      tabIndex={0}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={vi.key}
            data-index={vi.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vi.start}px)`,
            }}
          >
            <PageRow
              pageNumber={vi.index + 1}
              scale={scale}
              rotation={rotation}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
