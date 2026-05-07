"use client"

import { clear, createStore, del, get, set, values } from "idb-keyval"
import type { PdfMetadata, PdfPageText } from "@/lib/pdf/types"

// Three separate IndexedDB databases. Keeping them on different `dbName`s
// avoids `idb-keyval`'s lack of automatic version upgrades when adding
// a new object store to an existing DB.
const blobStore = createStore("pdf-uploads", "blobs")
const metaStore = createStore("pdf-meta", "items")
const textStore = createStore("pdf-text", "items")

// ── Blob bytes ────────────────────────────────────────────────────────

export function putPdfBlob(id: string, blob: Blob): Promise<void> {
  return set(id, blob, blobStore)
}

export function getPdfBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, blobStore)
}

export function delPdfBlob(id: string): Promise<void> {
  return del(id, blobStore)
}

export function clearPdfBlobs(): Promise<void> {
  return clear(blobStore)
}

// ── Persisted metadata ────────────────────────────────────────────────

export interface PersistedUpload {
  id: string
  name: string
  size: number
  metadata: PdfMetadata
  createdAt: number
}

export function putUploadMeta(record: PersistedUpload): Promise<void> {
  return set(record.id, record, metaStore)
}

export function delUploadMeta(id: string): Promise<void> {
  return del(id, metaStore)
}

export function getAllUploadMeta(): Promise<PersistedUpload[]> {
  return values<PersistedUpload>(metaStore)
}

export function clearUploadMeta(): Promise<void> {
  return clear(metaStore)
}

// ── Persisted page text (for chat / RAG) ──────────────────────────────

export function putPdfText(id: string, pages: PdfPageText[]): Promise<void> {
  return set(id, pages, textStore)
}

export function getPdfText(id: string): Promise<PdfPageText[] | undefined> {
  return get<PdfPageText[]>(id, textStore)
}

export function delPdfText(id: string): Promise<void> {
  return del(id, textStore)
}

export function clearPdfText(): Promise<void> {
  return clear(textStore)
}

// ── Logout cleanup ────────────────────────────────────────────────────

export async function clearAllUploadData(): Promise<void> {
  await Promise.all([
    clearPdfBlobs().catch(() => {}),
    clearUploadMeta().catch(() => {}),
    clearPdfText().catch(() => {}),
  ])
}
