import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import type {
  ParseError,
  PdfMetadata,
  UploadStatus,
} from "@/lib/pdf/types"
import {
  delPdfBlob,
  delUploadMeta,
  getAllUploadMeta,
  putPdfBlob,
} from "./storage"
import { parsePdfBuffer } from "./worker/parser-client"

export interface UploadEntity {
  id: string
  name: string
  size: number
  status: UploadStatus
  metadata?: PdfMetadata
  error?: ParseError
  createdAt: number
}

const adapter = createEntityAdapter<UploadEntity>({
  sortComparer: (a, b) => b.createdAt - a.createdAt,
})

const slice = createSlice({
  name: "uploads",
  initialState: adapter.getInitialState(),
  reducers: {
    addUpload: adapter.addOne,
    setStatus(
      state,
      action: PayloadAction<{ id: string; status: UploadStatus }>,
    ) {
      adapter.updateOne(state, {
        id: action.payload.id,
        changes: { status: action.payload.status },
      })
    },
    setMetadata(
      state,
      action: PayloadAction<{ id: string; metadata: PdfMetadata }>,
    ) {
      adapter.updateOne(state, {
        id: action.payload.id,
        changes: {
          metadata: action.payload.metadata,
          status: "ready",
        },
      })
    },
    setError(
      state,
      action: PayloadAction<{ id: string; error: ParseError }>,
    ) {
      adapter.updateOne(state, {
        id: action.payload.id,
        changes: { error: action.payload.error, status: "error" },
      })
    },
    hydrateMany(state, action: PayloadAction<UploadEntity[]>) {
      adapter.upsertMany(state, action.payload)
    },
    removeUpload: adapter.removeOne,
    clearAll: adapter.removeAll,
  },
})

export const uploadsActions = slice.actions
export default slice.reducer

const selectors = adapter.getSelectors((s: RootState) => s.uploads)
export const selectAllUploads = selectors.selectAll
export const selectUploadById = selectors.selectById
export const selectUploadIds = selectors.selectIds
export const selectUploadCount = selectors.selectTotal

// ── Thunks ────────────────────────────────────────────────────────────

/**
 * Adds a file to the upload list, persists the blob to IndexedDB, and
 * parses metadata via pdfjs (which runs the heavy work in its own
 * Web Worker). Each step updates a single entity (entity adapter +
 * selectById = no global invalidation).
 */
export const startUpload = createAsyncThunk<void, File>(
  "uploads/start",
  async (file, { dispatch }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `upl_${Date.now()}_${Math.random().toString(36).slice(2)}`

    dispatch(
      uploadsActions.addUpload({
        id,
        name: file.name,
        size: file.size,
        status: "parsing",
        createdAt: Date.now(),
      }),
    )

    let buffer: ArrayBuffer
    try {
      buffer = await file.arrayBuffer()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read file"
      dispatch(uploadsActions.setError({ id, error: { code: "io", message } }))
      return
    }

    try {
      await putPdfBlob(
        id,
        new Blob([buffer], { type: file.type || "application/pdf" }),
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not write to local storage"
      const code = /quota/i.test(message) ? "quota" : "io"
      dispatch(uploadsActions.setError({ id, error: { code, message } }))
      return
    }

    try {
      const metadata = await parsePdfBuffer(buffer)
      dispatch(uploadsActions.setMetadata({ id, metadata }))
    } catch (err: unknown) {
      const parseErr = err as Partial<ParseError>
      const error: ParseError = {
        code: parseErr?.code ?? "unknown",
        message:
          parseErr?.message ??
          (err instanceof Error ? err.message : "Failed to parse PDF"),
      }
      dispatch(uploadsActions.setError({ id, error }))
      await delPdfBlob(id).catch(() => {})
    }
  },
)

/**
 * Removes the entry from state and both the blob and the persisted meta
 * from IndexedDB.
 */
export const removeUploadAndBlob = createAsyncThunk<void, string>(
  "uploads/remove",
  async (id, { dispatch }) => {
    dispatch(uploadsActions.removeUpload(id))
    await Promise.all([
      delPdfBlob(id).catch(() => {}),
      delUploadMeta(id).catch(() => {}),
    ])
  },
)

// Module-scoped guard. We only want to read IDB once per session — multiple
// route mounts of the hydrator must not double-dispatch or race.
let hasHydrated = false

export function resetUploadsHydratedFlag() {
  hasHydrated = false
}

/**
 * Reads persisted upload metadata from IndexedDB and seeds the slice.
 * Idempotent — safe to call from any client component on mount.
 */
export const hydrateUploads = createAsyncThunk<void, void>(
  "uploads/hydrate",
  async (_, { dispatch }) => {
    if (hasHydrated) return
    hasHydrated = true
    try {
      const records = await getAllUploadMeta()
      if (records.length === 0) return
      const entities: UploadEntity[] = records.map((r) => ({
        id: r.id,
        name: r.name,
        size: r.size,
        status: "ready",
        metadata: r.metadata,
        createdAt: r.createdAt,
      }))
      dispatch(uploadsActions.hydrateMany(entities))
    } catch {
      // Allow a future retry if the read failed.
      hasHydrated = false
    }
  },
)
