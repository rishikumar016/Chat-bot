export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export interface Conversation {
  id: string
  title: string
  documentId: string | null
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface PersistedChatState {
  conversations: Conversation[]
  activeConversationId: string | null
}
