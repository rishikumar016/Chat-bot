import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import { reset as authReset } from "@/lib/store/auth-slice"
import { chatActions } from "./slice"
import type { Conversation } from "./types"
import { clearChatState, saveChatState } from "./storage"

interface MinimalState {
  chat: {
    entities: Record<string, Conversation | undefined>
    ids: string[]
    activeConversationId: string | null
  }
}

export const chatListener = createListenerMiddleware()

// Persist whenever the chat state mutates in a meaningful way. Skipping
// transient actions (e.g. status flips during streaming) is unnecessary
// here because all the listed actions only fire at message-boundary
// points or on user intent.
chatListener.startListening({
  matcher: isAnyOf(
    chatActions.createConversation,
    chatActions.setActiveConversation,
    chatActions.setDocumentId,
    chatActions.appendMessage,
    chatActions.setMessages,
    chatActions.clearMessages,
    chatActions.deleteConversation,
    chatActions.hydrate,
  ),
  effect: async (_action, api) => {
    const state = api.getState() as MinimalState
    const conversations = state.chat.ids
      .map((id) => state.chat.entities[id])
      .filter((c): c is Conversation => Boolean(c))
    saveChatState({
      conversations,
      activeConversationId: state.chat.activeConversationId,
    })
  },
})

// On logout: drop everything and wipe localStorage.
chatListener.startListening({
  actionCreator: authReset,
  effect: async (_action, api) => {
    api.dispatch(chatActions.clearAll())
    clearChatState()
  },
})
