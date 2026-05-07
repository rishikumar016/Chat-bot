"use client"

import { clear, createStore, del, get, set, values } from "idb-keyval"
import type { Conversation } from "./types"

// IndexedDB > localStorage for chat history because:
//   • localStorage caps at ~5 MB; long conversations + code blocks blow it
//   • We can write *one* conversation at a time instead of stringifying
//     the whole array on every keystroke-completion
//   • Reads are async and don't block the main thread
const conversationsStore = createStore("pdf-chat", "conversations")
const metaStore = createStore("pdf-chat", "meta")

const ACTIVE_ID_KEY = "active"

export function putConversation(conv: Conversation): Promise<void> {
  return set(conv.id, conv, conversationsStore)
}

export function getAllConversations(): Promise<Conversation[]> {
  return values<Conversation>(conversationsStore)
}

export function delConversation(id: string): Promise<void> {
  return del(id, conversationsStore)
}

export function clearConversations(): Promise<void> {
  return clear(conversationsStore)
}

export function putActiveId(id: string | null): Promise<void> {
  return set(ACTIVE_ID_KEY, id, metaStore)
}

export function getActiveId(): Promise<string | null> {
  return get<string | null>(ACTIVE_ID_KEY, metaStore).then(
    (v) => v ?? null,
  )
}

export async function clearAllChatData(): Promise<void> {
  await Promise.all([
    clearConversations().catch(() => {}),
    clear(metaStore).catch(() => {}),
  ])
}
