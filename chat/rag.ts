"use client"

import { getPdfText } from "@/upload/storage"
import type { UploadEntity } from "@/upload/slice"

const MAX_DOC_CHARS = 80_000 // ~20–25K tokens — keeps room for chat history

export interface DocumentContext {
  id: string
  title: string
  pageCount: number
  text: string
  truncated: boolean
}

/**
 * Loads page text from IndexedDB and assembles the system-context payload
 * for a document. Truncates to a fixed character budget; flags `truncated`
 * so the prompt can mention it. Returns null if no upload is found or the
 * doc has no extracted text.
 */
export async function buildDocumentContext(
  upload: UploadEntity | undefined,
): Promise<DocumentContext | null> {
  if (!upload || !upload.metadata) return null

  const pages = await getPdfText(upload.id).catch(() => undefined)
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
    id: upload.id,
    title: upload.metadata.title || upload.name,
    pageCount: upload.metadata.pageCount,
    text,
    truncated,
  }
}
