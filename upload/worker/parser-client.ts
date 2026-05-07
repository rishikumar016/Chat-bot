"use client"

// pdfjs already runs all heavy parsing inside its own Web Worker
// (pdf.worker.mjs, configured in @/lib/pdf/pdfjs-config). This client
// sits on the main thread, hands the buffer to pdfjs, and the worker
// does the work — so the main thread stays unblocked.
//
// Importantly: pdfjs is *lazy-imported* here. It accesses DOMMatrix at
// module top level, which doesn't exist on the Node server. The slice
// that imports this file is loaded by the Redux store on the server too
// (during PPR prerender), so a static import of pdfjs would crash the
// build.

import type { ParseError, ParseErrorCode, PdfMetadata } from "@/lib/pdf/types"

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

/**
 * Parses metadata from a PDF buffer using pdfjs's worker.
 * Throws a `ParseError` (typed code + message) on failure.
 */
export async function parsePdfBuffer(buffer: ArrayBuffer): Promise<PdfMetadata> {
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
    for (let i = 1; i <= sampleLimit; i++) {
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1 })
      pageDims.push({ width: vp.width, height: vp.height })
      page.cleanup()
    }

    return {
      pageCount,
      title: info.Title,
      author: info.Author,
      pageDims,
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
