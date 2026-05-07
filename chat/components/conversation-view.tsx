"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { RefreshCwIcon, XIcon } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { Button } from "@/components/ui/button"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { Shimmer } from "@/components/ai-elements/shimmer"

import {
  chatActions,
  selectConversationById,
} from "../slice"
import type { ChatAttachment, ChatMessage } from "../types"
import { loadAttachmentPayload, type AttachmentPayload } from "../rag"
import { MessageItem } from "./message-item"
import { AttachmentPicker } from "./attachment-picker"

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function getMessageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

function toUIMessage(m: ChatMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }
}

function getApiErrorMessage(err: Error | undefined): string | null {
  if (!err) return null
  return err.message || "The assistant failed to respond."
}

interface Props {
  conversationId: string
}

/**
 * Owns useChat for a single conversation. Re-keying this on `conversationId`
 * (in the parent) is what swaps the active thread — useChat doesn't react
 * to id changes, so we use React's remount semantics instead.
 */
export function ConversationView({ conversationId }: Props) {
  const dispatch = useAppDispatch()
  const conv = useAppSelector((s) => selectConversationById(s, conversationId))

  const [pendingAttachment, setPendingAttachment] =
    useState<ChatAttachment | null>(null)
  const [input, setInput] = useState("")

  // Hold the *full* attachment payload (with extracted text) in a ref
  // so the transport's body callback sees the latest value without
  // re-instantiating the transport on every attachment change. The
  // payload is loaded from IndexedDB just-in-time on submit so we
  // don't pay the read cost until the user actually sends a message.
  const attachmentPayloadRef = useRef<AttachmentPayload | null>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ attachment: attachmentPayloadRef.current }),
      }),
    [],
  )

  // Seed useChat from the persisted slice exactly once (the parent
  // remounts us when conversationId changes).
  const initialMessages = useMemo<UIMessage[]>(
    () => (conv?.messages ?? []).map(toUIMessage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const { messages, sendMessage, status, error, stop, regenerate, clearError } =
    useChat({
      messages: initialMessages,
      transport,
      // Throttle UI message updates to ~20 fps. Without this, useChat
      // re-renders the message list on every token chunk; older messages
      // would re-render too if not memoized. Cuts render work by 5–10x.
      experimental_throttle: 50,
      onFinish: ({ message }) => {
        const text = getMessageText(message)
        if (!text) return
        dispatch(
          chatActions.appendMessage({
            conversationId,
            message: {
              id: message.id,
              role: "assistant",
              content: text,
              createdAt: Date.now(),
            },
          }),
        )
      },
    })

  // Build a stable lookup of attachments by message id from the slice.
  // Reference is stable across token streams — only changes when slice
  // messages array changes.
  const attachmentByMsgId = useMemo(() => {
    const m = new Map<string, ChatAttachment>()
    if (!conv) return m
    for (const msg of conv.messages) {
      if (msg.attachment) m.set(msg.id, msg.attachment)
    }
    return m
  }, [conv?.messages])

  const lastMessageId = messages[messages.length - 1]?.id

  const handleSubmit = useCallback(
    async (msg: { text: string }) => {
      const text = msg.text.trim()
      if (!text) return

      const userMessageId = uid()
      const attachment = pendingAttachment

      // Persist the user message immediately (with attachment metadata)
      // so a refresh mid-stream doesn't lose it.
      dispatch(
        chatActions.appendMessage({
          conversationId,
          message: {
            id: userMessageId,
            role: "user",
            content: text,
            createdAt: Date.now(),
            ...(attachment ? { attachment } : {}),
          },
        }),
      )

      setInput("")
      // Don't clear pendingAttachment — keeps it sticky for follow-ups
      // about the same doc. User can clear manually with the X chip.

      // Load the document's extracted text from IDB just-in-time, then
      // stash in the ref the transport reads from. Falls back to
      // metadata-only if extraction is missing (image-only PDF, etc.).
      if (attachment) {
        const full = await loadAttachmentPayload(attachment).catch(() => null)
        attachmentPayloadRef.current = full ?? {
          ...attachment,
          text: "",
          truncated: false,
        }
      } else {
        attachmentPayloadRef.current = null
      }

      // Pass a full message (id + role + parts) so useChat APPENDS it to
      // its messages array. The `{ text, messageId }` overload treats
      // messageId as REPLACE-an-existing-message — passing a new id
      // there would cause useChat to silently no-op, leaving the chat UI
      // empty even though our slice received the user message.
      await sendMessage({
        id: userMessageId,
        role: "user",
        parts: [{ type: "text", text }],
      })
    },
    [conversationId, dispatch, pendingAttachment, sendMessage],
  )

  const handleClear = useCallback(() => {
    dispatch(chatActions.clearMessages(conversationId))
    setPendingAttachment(null)
    setInput("")
  }, [conversationId, dispatch])

  const apiErrorMessage = getApiErrorMessage(error)

  return (
    <>


      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a new conversation"
              description="Attach a PDF below to chat about its content. Without an attachment you'll get a plain reply."
            />
          ) : (
            messages.map((m) => (
              <MessageItem
                key={m.id}
                id={m.id}
                role={m.role}
                text={getMessageText(m)}
                isStreaming={status === "streaming" && m.id === lastMessageId}
                attachment={attachmentByMsgId.get(m.id)}
              />
            ))
          )}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}

          {apiErrorMessage && (
            <Message from="assistant">
              <MessageContent>
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p className="font-medium">Something went wrong</p>
                  <p className="mt-1 break-words">{apiErrorMessage}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        clearError()
                        regenerate()
                      }}
                    >
                      <RefreshCwIcon className="mr-1 size-3.5" />
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => clearError()}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          {pendingAttachment && (
            <PromptInputHeader>
              <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs">
                <span className="font-medium">{pendingAttachment.title}</span>
                <span className="text-muted-foreground">
                  · {pendingAttachment.pageCount} pages
                </span>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(null)}
                  className="rounded-sm text-muted-foreground hover:text-foreground"
                  aria-label="Remove attachment"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </PromptInputHeader>
          )}
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                pendingAttachment
                  ? `Ask about “${pendingAttachment.title}”…`
                  : "Type a message…"
              }
              disabled={status === "streaming" || status === "submitted"}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <AttachmentPicker onPick={setPendingAttachment} />
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  )
}
