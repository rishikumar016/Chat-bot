"use client"

import { clear, createStore, del, get, set, values } from "idb-keyval"
import type { PdfMetadata } from "@/lib/pdf/types"

// Two separate IndexedDB databases. Keeping them on different `dbName`s
// avoids `idb-keyval`'s lack of automatic version upgrades when adding
// a second object store to an existing DB.
const blobStore = createStore("pdf-uploads", "blobs")
const metaStore = createStore("pdf-meta", "items")

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

// ── Logout cleanup ────────────────────────────────────────────────────

export async function clearAllUploadData(): Promise<void> {
  await Promise.all([
    clearPdfBlobs().catch(() => {}),
    clearUploadMeta().catch(() => {}),
  ])
}
