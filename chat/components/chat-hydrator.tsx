"use client"

import { useEffect } from "react"
import { useAppDispatch } from "@/lib/store/hooks"
import { chatActions } from "../slice"
import { loadChatState } from "../storage"

let hasHydrated = false

/**
 * Reads persisted chat state from localStorage on mount and seeds the
 * Redux slice. Renders nothing. Module-scoped guard prevents double-runs
 * across remounts; the auth/reset listener clears localStorage so the
 * next user starts fresh.
 */
export function ChatHydrator() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (hasHydrated) return
    hasHydrated = true
    const persisted = loadChatState()
    if (!persisted) return
    dispatch(
      chatActions.hydrate({
        conversations: persisted.conversations,
        activeConversationId: persisted.activeConversationId,
      }),
    )
  }, [dispatch])
  return null
}

export function resetChatHydratedFlag() {
  hasHydrated = false
}
