"use client"

import { getPdfText } from "@/upload/storage"
import type { ChatAttachment } from "./types"

const MAX_DOC_CHARS = 80_000 // ~20–25K tokens — leaves room for chat history

export interface AttachmentPayload {
  id: string
  title: string
  pageCount: number
  text: string
  truncated: boolean
}

/**
 * Loads page text from IndexedDB and assembles the request payload for
 * a document attachment. Concatenates with [Page N] markers and truncates
 * to a fixed character budget; flags `truncated` so the prompt can mention
 * it. Returns null if no text was extracted (corrupted / image-only PDF).
 */
export async function loadAttachmentPayload(
  meta: ChatAttachment,
): Promise<AttachmentPayload | null> {
  const pages = await getPdfText(meta.id).catch(() => undefined)
  if (!pages || pages.length === 0) return null

  let text = ""
  let truncated = false
  for (const p of pages) {
    const chunk = `\n[Page ${p.pageNumber}]\n${p.text}`
    if (text.length + chunk.length > MAX_DOC_CHARS) {
      const remaining = MAX_DOC_CHARS - text.length
      if (remaining > 0) text += chunk.slice(0, remaining)
      truncated = true
      break
    }
    text += chunk
  }

  return {
    id: meta.id,
    title: meta.title,
    pageCount: meta.pageCount,
    text,
    truncated,
  }
}
