"use client"

import type { ParseError, ParseErrorCode, PdfMetadata } from "@/lib/pdf/types"

interface PendingRequest {
  resolve: (m: PdfMetadata) => void
  reject: (e: ParseError) => void
}

type WorkerResponse =
  | { type: "parsed"; id: string; metadata: PdfMetadata }
  | { type: "error"; id: string; code: ParseErrorCode; message: string }

let worker: Worker | null = null
const inflight = new Map<string, PendingRequest>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(
    new URL("./pdf-parser.worker.ts", import.meta.url),
    { type: "module" },
  )
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const data = e.data
    const req = inflight.get(data.id)
    if (!req) return
    inflight.delete(data.id)
    if (data.type === "parsed") req.resolve(data.metadata)
    else req.reject({ code: data.code, message: data.message })
  }
  worker.onerror = () => {
    // Reject everything in-flight; downstream will mark uploads as errored.
    for (const [id, req] of inflight) {
      req.reject({ code: "unknown", message: "Worker crashed" })
      inflight.delete(id)
    }
  }
  return worker
}

export async function parsePdf(id: string, file: File): Promise<PdfMetadata> {
  const w = getWorker()
  const buffer = await file.arrayBuffer()
  return new Promise<PdfMetadata>((resolve, reject) => {
    inflight.set(id, { resolve, reject })
    w.postMessage({ type: "parse", id, buffer }, [buffer])
  })
}

export function terminateParser(): void {
  worker?.terminate()
  worker = null
  inflight.clear()
}
