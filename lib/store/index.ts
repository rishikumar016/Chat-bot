import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"
import authReducer from "./auth-slice"
import viewerReducer from "./viewer-slice"
import { authApi } from "./auth-api"
import uploadsReducer from "@/upload/slice"
import { uploadsListener } from "@/upload/listener"
import { injectStore } from "./store-ref"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    uploads: uploadsReducer,
    viewer: viewerReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(uploadsListener.middleware)
      .concat(authApi.middleware),
})

setupListeners(store.dispatch)
injectStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
