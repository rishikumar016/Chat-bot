import type { EnhancedStore } from "@reduxjs/toolkit"

let _store: EnhancedStore | null = null

export function injectStore(store: EnhancedStore) {
  _store = store
}

export function getStore(): EnhancedStore | null {
  return _store
}
