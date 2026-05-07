"use client"

import { useEffect } from "react"
import { useAppDispatch } from "@/lib/store/hooks"
import { chatActions } from "../slice"
import {
  delConversation,
  getActiveId,
  getAllConversations,
} from "../storage"
import type { Conversation } from "../types"

let hasHydrated = false

/**
 * Reads persisted chat state from IndexedDB on mount and seeds the
 * Redux slice. Renders nothing. Module-scoped guard prevents double-runs
 * across remounts; the auth/reset listener clears IDB so the next user
 * starts fresh on this device.
 *
 * Also dedupes empty conversations on hydrate — keeps at most one empty
 * "New conversation" so prior bugs don't leave the sidebar full of
 * placeholders.
 */
export function ChatHydrator() {
  const dispatch = useAppDispatch()
  useEffect(() => {
    if (hasHydrated) return
    hasHydrated = true
    Promise.all([getAllConversations(), getActiveId()])
      .then(async ([conversations, activeId]) => {
        const { kept, removed } = dedupeEmpties(conversations)

        // Drop the de-duped empties from IDB too, so the next reload
        // doesn't see them again.
        if (removed.length > 0) {
          await Promise.all(
            removed.map((id) => delConversation(id).catch(() => {})),
          )
        }

        // Validate active id — if it pointed to a removed empty, clear it.
        const validActiveId =
          activeId && kept.some((c) => c.id === activeId) ? activeId : null

        if (kept.length === 0 && validActiveId == null) return

        dispatch(
          chatActions.hydrate({
            conversations: kept,
            activeConversationId: validActiveId,
          }),
        )
      })
      .catch(() => {
        hasHydrated = false // allow a future retry
      })
  }, [dispatch])
  return null
}

export function resetChatHydratedFlag() {
  hasHydrated = false
}

function dedupeEmpties(conversations: Conversation[]): {
  kept: Conversation[]
  removed: string[]
} {
  const empties = conversations.filter((c) => c.messages.length === 0)
  const nonEmpties = conversations.filter((c) => c.messages.length > 0)

  if (empties.length <= 1) {
    return { kept: conversations, removed: [] }
  }

  // Keep the most recently touched empty; discard the rest.
  const sorted = [...empties].sort((a, b) => b.updatedAt - a.updatedAt)
  const keepEmpty = sorted[0]!
  const dropEmpties = sorted.slice(1)

  return {
    kept: [...nonEmpties, keepEmpty],
    removed: dropEmpties.map((c) => c.id),
  }
}
