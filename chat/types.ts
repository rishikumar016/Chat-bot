export interface ChatAttachment {
  id: string
  title: string
  pageCount: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  attachment?: ChatAttachment
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}
