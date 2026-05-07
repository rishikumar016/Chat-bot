"use client"

import { clear, createStore, del, get, set } from "idb-keyval"

// Per-origin IndexedDB store. The blob bytes live here so the Redux store
// only ever holds metadata — keeps state serializable and re-renders cheap.
const blobStore = createStore("pdf-uploads", "blobs")

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
