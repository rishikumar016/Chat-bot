"use client"

import type {
  ParseError,
  ParseErrorCode,
  ParsedPdf,
  PdfMetadata,
  PdfPageText,
} from "@/lib/pdf/types"

const SAMPLE_PAGE_LIMIT = 5

function classify(err: unknown): ParseError {
  let code: ParseErrorCode = "unknown"
  const errName =
    err && typeof err === "object" && "name" in err
      ? (err as { name: string }).name
      : ""
  if (errName === "PasswordException") code = "password"
  else if (errName === "InvalidPDFException") code = "corrupted"
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Failed to parse PDF"
  return { code, message }
}

interface PdfjsTextItem {
  str?: string
  hasEOL?: boolean
}

function joinTextItems(items: PdfjsTextItem[]): string {
  let out = ""
  for (const item of items) {
    if (typeof item.str === "string") {
      out += item.str
    }
    if (item.hasEOL) {
      out += "\n"
    } else {
      out += " "
    }
  }
  return out
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .trim()
}

/**
 * Parses metadata AND extracts text from a PDF buffer in a single
 * pdfjs document load. Text extraction is needed for the chat's
 * basic-RAG flow. Heavy parsing runs in pdfjs's worker; we coordinate
 * on the main thread.
 *
 * Throws a `ParseError` (typed code + message) on failure.
 */
export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<ParsedPdf> {
  if (typeof window === "undefined") {
    throw {
      code: "io" as ParseErrorCode,
      message: "parsePdfBuffer can only run in the browser",
    } satisfies ParseError
  }

  const { pdfjs } = await import("@/lib/pdf/pdfjs-config")

  // Copy because pdfjs may take ownership of the underlying ArrayBuffer.
  const data = new Uint8Array(buffer.slice(0))
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
  })

  let doc: Awaited<typeof loadingTask.promise> | null = null
  try {
    doc = await loadingTask.promise
    const meta = await doc.getMetadata().catch(() => null)
    const info = (meta?.info ?? {}) as { Title?: string; Author?: string }
    const pageCount = doc.numPages

    const sampleLimit = Math.min(pageCount, SAMPLE_PAGE_LIMIT)
    const pageDims: PdfMetadata["pageDims"] = []
    const pages: PdfPageText[] = []

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i)
      if (i <= sampleLimit) {
        const vp = page.getViewport({ scale: 1 })
        pageDims.push({ width: vp.width, height: vp.height })
      }
      const textContent = await page.getTextContent()
      pages.push({
        pageNumber: i,
        text: joinTextItems(textContent.items as PdfjsTextItem[]),
      })
      page.cleanup()
    }

    return {
      metadata: {
        pageCount,
        title: info.Title,
        author: info.Author,
        pageDims,
      },
      pages,
    }
  } catch (err) {
    throw classify(err)
  } finally {
    if (doc) {
      try {
        await doc.destroy()
      } catch {
        // best-effort cleanup
      }
    }
  }
}
