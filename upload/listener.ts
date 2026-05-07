import { createListenerMiddleware } from "@reduxjs/toolkit"
import { reset as authReset } from "@/lib/store/auth-slice"
import { uploadsActions } from "./slice"
import { clearPdfBlobs } from "./storage"

export const uploadsListener = createListenerMiddleware()

// On logout, drop all upload metadata from state and wipe the IndexedDB
// blob store so the next user on this device sees a clean slate.
uploadsListener.startListening({
  actionCreator: authReset,
  effect: async (_action, api) => {
    api.dispatch(uploadsActions.clearAll())
    await clearPdfBlobs().catch(() => {})
  },
})
