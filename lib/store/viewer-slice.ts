import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "./index"

export interface ViewerState {
  currentPage: number
  scale: number
  rotation: number
  // Set by toolbar to request a scroll; viewport consumes and clears.
  pendingJump: number | null
}

const initialState: ViewerState = {
  currentPage: 1,
  scale: 1,
  rotation: 0,
  pendingJump: null,
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3

const slice = createSlice({
  name: "viewer",
  initialState,
  reducers: {
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload
    },
    setScale(state, action: PayloadAction<number>) {
      state.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, action.payload))
    },
    setRotation(state, action: PayloadAction<number>) {
      state.rotation = ((action.payload % 360) + 360) % 360
    },
    requestJump(state, action: PayloadAction<number>) {
      state.pendingJump = action.payload
      state.currentPage = action.payload
    },
    clearJump(state) {
      state.pendingJump = null
    },
    resetViewer() {
      return initialState
    },
  },
})

export const viewerActions = slice.actions
export default slice.reducer

export const selectCurrentPage = (s: RootState) => s.viewer.currentPage
export const selectScale = (s: RootState) => s.viewer.scale
export const selectRotation = (s: RootState) => s.viewer.rotation
export const selectPendingJump = (s: RootState) => s.viewer.pendingJump
