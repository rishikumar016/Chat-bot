import {
  createEntityAdapter,
  createSlice,
  type EntityState,
  type PayloadAction,
} from "@reduxjs/toolkit"
import type { RootState } from "@/lib/store"
import type { ChatMessage, Conversation } from "./types"

const adapter = createEntityAdapter<Conversation>({
  sortComparer: (a, b) => b.updatedAt - a.updatedAt,
})

interface ExtraState {
  activeConversationId: string | null
}

type ChatSliceState = EntityState<Conversation, string> & ExtraState

const initialState: ChatSliceState = adapter.getInitialState({
  activeConversationId: null,
})

const slice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    createConversation(state, action: PayloadAction<{ id: string }>) {
      const { id } = action.payload
      const now = Date.now()
      adapter.addOne(state, {
        id,
        title: "New conversation",
        messages: [],
        createdAt: now,
        updatedAt: now,
      })
      state.activeConversationId = id
    },
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload
    },
    appendMessage(
      state,
      action: PayloadAction<{ conversationId: string; message: ChatMessage }>,
    ) {
      const conv = state.entities[action.payload.conversationId]
      if (!conv) return
      conv.messages.push(action.payload.message)
      conv.updatedAt = Date.now()
      // First user message becomes the title (truncated).
      if (
        action.payload.message.role === "user" &&
        conv.title === "New conversation"
      ) {
        conv.title =
          action.payload.message.content.slice(0, 40).trim() ||
          "New conversation"
      }
    },
    setMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: ChatMessage[] }>,
    ) {
      adapter.updateOne(state, {
        id: action.payload.conversationId,
        changes: { messages: action.payload.messages, updatedAt: Date.now() },
      })
    },
    clearMessages(state, action: PayloadAction<string>) {
      adapter.updateOne(state, {
        id: action.payload,
        changes: { messages: [], title: "New conversation", updatedAt: Date.now() },
      })
    },
    deleteConversation(state, action: PayloadAction<string>) {
      adapter.removeOne(state, action.payload)
      if (state.activeConversationId === action.payload) {
        state.activeConversationId = null
      }
    },
    clearAll(state) {
      adapter.removeAll(state)
      state.activeConversationId = null
    },
    hydrate(
      state,
      action: PayloadAction<{
        conversations: Conversation[]
        activeConversationId: string | null
      }>,
    ) {
      adapter.upsertMany(state, action.payload.conversations)
      state.activeConversationId = action.payload.activeConversationId
    },
  },
})

export const chatActions = slice.actions
export default slice.reducer

const selectors = adapter.getSelectors((s: RootState) => s.chat)
export const selectAllConversations = selectors.selectAll
export const selectConversationById = selectors.selectById
export const selectActiveConversationId = (s: RootState) =>
  s.chat.activeConversationId
export const selectActiveConversation = (s: RootState) =>
  s.chat.activeConversationId
    ? s.chat.entities[s.chat.activeConversationId]
    : undefined
