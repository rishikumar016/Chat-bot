/// <reference lib="webworker" />

// Runs entirely off the main thread. Uses pdfjs in single-threaded mode
// (disableWorker: true) since we're already inside a Worker — pdfjs's own
// worker isn't needed for metadata-only extraction.

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"
import type { ParseErrorCode, PdfMetadata } from "@/lib/pdf/types"

interface ParseRequest {
  type: "parse"
  id: string
  buffer: ArrayBuffer
}

type ParseResponse =
  | { type: "parsed"; id: string; metadata: PdfMetadata }
  | { type: "error"; id: string; code: ParseErrorCode; message: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope

const SAMPLE_PAGE_LIMIT = 5

ctx.onmessage = async (e: MessageEvent<ParseRequest>) => {
  const { id, buffer } = e.data
  try {
    // We're already inside a Worker — disable pdfjs's own sub-worker so it
    // runs synchronously here. `disableWorker` is a runtime option that
    // pdfjs honors but isn't in the typed surface, hence the cast.
    const loadingTask = pdfjs.getDocument({
      data: buffer,
      isEvalSupported: false,
      disableWorker: true,
    } as Parameters<typeof pdfjs.getDocument>[0])
    const doc = await loadingTask.promise
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

    await doc.destroy()

    const response: ParseResponse = {
      type: "parsed",
      id,
      metadata: {
        pageCount,
        title: info.Title,
        author: info.Author,
        pageDims,
      },
    }
    ctx.postMessage(response)
  } catch (err: unknown) {
    let code: ParseErrorCode = "unknown"
    const errName =
      err && typeof err === "object" && "name" in err
        ? (err as { name: string }).name
        : ""
    if (errName === "PasswordException") code = "password"
    else if (errName === "InvalidPDFException") code = "corrupted"
    const message = err instanceof Error ? err.message : "Failed to parse PDF"
    const response: ParseResponse = { type: "error", id, code, message }
    ctx.postMessage(response)
  }
}

export {}
