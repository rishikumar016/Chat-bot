import { createListenerMiddleware } from "@reduxjs/toolkit"
import { reset as authReset } from "@/lib/store/auth-slice"
import {
  resetUploadsHydratedFlag,
  uploadsActions,
  type UploadEntity,
} from "./slice"
import {
  clearAllUploadData,
  putUploadMeta,
  type PersistedUpload,
} from "./storage"

// No RootState generic — would form a circular type with `lib/store/index`,
// which imports this middleware. We narrow at the use site instead.
export const uploadsListener = createListenerMiddleware()

interface UploadsState {
  entities: Record<string, UploadEntity | undefined>
}

interface MinimalState {
  uploads: UploadsState
}

// Persist metadata to IndexedDB whenever an upload reaches the "ready"
// state, so the documents list survives reloads.
uploadsListener.startListening({
  actionCreator: uploadsActions.setMetadata,
  effect: async (action, api) => {
    const { id } = action.payload
    const state = api.getState() as MinimalState
    const upload = state.uploads.entities[id]
    if (!upload || !upload.metadata) return
    const record: PersistedUpload = {
      id: upload.id,
      name: upload.name,
      size: upload.size,
      metadata: upload.metadata,
      createdAt: upload.createdAt,
    }
    await putUploadMeta(record).catch(() => {
      // Persistence is best-effort; failing here just means the row
      // won't survive a reload — surfaced as a missing entry on hydrate.
    })
  },
})

// On logout: clear in-memory state, wipe IDB, reset the hydrate guard
// so the next user on this device starts fresh.
uploadsListener.startListening({
  actionCreator: authReset,
  effect: async (_action, api) => {
    api.dispatch(uploadsActions.clearAll())
    resetUploadsHydratedFlag()
    await clearAllUploadData()
  },
})
