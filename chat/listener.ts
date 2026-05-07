import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import { reset as authReset } from "@/lib/store/auth-slice"
import { chatActions } from "./slice"
import type { Conversation } from "./types"
import {
  clearAllChatData,
  delConversation,
  putActiveId,
  putConversation,
} from "./storage"

interface MinimalState {
  chat: {
    entities: Record<string, Conversation | undefined>
    ids: string[]
    activeConversationId: string | null
  }
}

export const chatListener = createListenerMiddleware()

async function persistConversation(api: { getState: () => unknown }, id: string) {
  const state = api.getState() as MinimalState
  const conv = state.chat.entities[id]
  if (!conv) return
  await putConversation(conv).catch(() => {
    // Best-effort persistence — failure means the row won't survive a
    // reload. Could surface via toast in a future iteration.
  })
}

// Per-conversation persistence: write only the conversation that
// actually changed. Avoids re-stringifying the whole list on every
// message append (which scales O(N) per write).
chatListener.startListening({
  matcher: isAnyOf(
    chatActions.createConversation,
    chatActions.appendMessage,
    chatActions.setMessages,
  ),
  effect: async (action, api) => {
    const payload = action.payload as
      | { id: string }
      | { conversationId: string }
    const id = "conversationId" in payload ? payload.conversationId : payload.id
    await persistConversation(api, id)
  },
})

chatListener.startListening({
  actionCreator: chatActions.clearMessages,
  effect: async (action, api) => {
    await persistConversation(api, action.payload)
  },
})

// Active conversation id lives in its own meta record so changing the
// pointer doesn't rewrite any conversation.
chatListener.startListening({
  matcher: isAnyOf(
    chatActions.createConversation,
    chatActions.setActiveConversation,
  ),
  effect: async (_action, api) => {
    const state = api.getState() as MinimalState
    await putActiveId(state.chat.activeConversationId).catch(() => {})
  },
})

// Deleting a conversation removes it from IDB and may shift the active id.
chatListener.startListening({
  actionCreator: chatActions.deleteConversation,
  effect: async (action, api) => {
    const state = api.getState() as MinimalState
    await Promise.all([
      delConversation(action.payload).catch(() => {}),
      putActiveId(state.chat.activeConversationId).catch(() => {}),
    ])
  },
})

// On logout: drop everything in state + IDB.
chatListener.startListening({
  actionCreator: authReset,
  effect: async (_action, api) => {
    api.dispatch(chatActions.clearAll())
    await clearAllChatData()
  },
})
