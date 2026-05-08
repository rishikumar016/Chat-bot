"use client"

import { useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  chatActions,
  selectActiveConversationId,
  selectAllConversations,
} from "../slice"
import { ConversationView } from "./conversation-view"

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * The /dashboard page entry. Ensures an active conversation exists, then
 * mounts <ConversationView> keyed on its id. Re-keying remounts the
 * conversation tree (and useChat with it) when the user picks a different
 * conversation in the sidebar.
 */
export function ChatShell() {
  const dispatch = useAppDispatch()
  const activeId = useAppSelector(selectActiveConversationId)
  const conversations = useAppSelector(selectAllConversations)
  const hasEnsuredRef = useRef(false)

  useEffect(() => {
    if (activeId) return
    if (hasEnsuredRef.current) return
    hasEnsuredRef.current = true

    const empty = conversations.find((c) => c.messages.length === 0)
    if (empty) {
      dispatch(chatActions.setActiveConversation(empty.id))
    } else {
      dispatch(chatActions.createConversation({ id: uid() }))
    }
  }, [activeId, conversations, dispatch])

  if (!activeId) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Starting a new conversation…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ConversationView key={activeId} conversationId={activeId} />
    </div>
  )
}
