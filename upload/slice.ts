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
import { delPdfBlob, putPdfBlob } from "./storage"
import { parsePdf } from "./worker/parser-client"

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
 * kicks the parser worker — all in parallel. Each step updates the
 * single entity (entity adapter + selectById = no global invalidation).
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

    try {
      const [, metadata] = await Promise.all([
        putPdfBlob(id, file),
        parsePdf(id, file),
      ])
      dispatch(uploadsActions.setMetadata({ id, metadata }))
    } catch (err: unknown) {
      const parseErr = err as Partial<ParseError>
      const error: ParseError = {
        code: parseErr?.code ?? "unknown",
        message:
          parseErr?.message ??
          (err instanceof Error ? err.message : "Failed to upload"),
      }
      dispatch(uploadsActions.setError({ id, error }))
      await delPdfBlob(id).catch(() => {})
    }
  },
)

/**
 * Removes the entry from state and the blob from IndexedDB.
 */
export const removeUploadAndBlob = createAsyncThunk<void, string>(
  "uploads/remove",
  async (id, { dispatch }) => {
    dispatch(uploadsActions.removeUpload(id))
    await delPdfBlob(id).catch(() => {})
  },
)
