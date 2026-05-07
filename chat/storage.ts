"use client"

import type { PersistedChatState } from "./types"

const STORAGE_KEY = "chat-history-v1"

export function loadChatState(): PersistedChatState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedChatState
  } catch {
    return null
  }
}

export function saveChatState(state: PersistedChatState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or unavailable — best effort
  }
}

export function clearChatState(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
