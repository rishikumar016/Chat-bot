"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { RefreshCwIcon } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  chatActions,
  selectActiveConversation,
  selectActiveConversationId,
} from "../slice"
import type { ChatMessage } from "../types"
import { buildDocumentContext } from "../rag"
import { selectUploadById } from "@/upload/slice"
import { Button } from "@/components/ui/button"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { DocumentContextSelect } from "./document-context-select"

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

function toChatMessage(m: UIMessage): ChatMessage | null {
  if (m.role !== "user" && m.role !== "assistant") return null
  const text = getMessageText(m)
  if (!text) return null
  return {
    id: m.id,
    role: m.role,
    content: text,
    createdAt: Date.now(),
  }
}

export function ChatShell() {
  const dispatch = useAppDispatch()
  const activeId = useAppSelector(selectActiveConversationId)
  const activeConv = useAppSelector(selectActiveConversation)

  // Lazily create a conversation on first mount if there isn't one.
  useEffect(() => {
    if (!activeId) {
      dispatch(chatActions.createConversation({ id: uid() }))
    }
  }, [activeId, dispatch])

  // Document context — selected by user; persisted on the conversation.
  const documentId = activeConv?.documentId ?? null
  const upload = useAppSelector((s) =>
    documentId ? selectUploadById(s, documentId) : undefined,
  )

  // Hold the latest doc-context payload in a ref so the transport's
  // dynamic body callback always reads the current value without
  // recreating the transport on each render.
  const docCtxRef = useRef<Awaited<
    ReturnType<typeof buildDocumentContext>
  > | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!upload) {
      docCtxRef.current = null
      return
    }
    buildDocumentContext(upload).then((ctx) => {
      if (!cancelled) docCtxRef.current = ctx
    })
    return () => {
      cancelled = true
    }
  }, [upload])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ documentContext: docCtxRef.current }),
      }),
    [],
  )

  const initialMessages = useMemo<UIMessage[]>(
    () => (activeConv?.messages ?? []).map(toUIMessage),
    // Only seed once per active conversation switch — useChat owns
    // messages after that. We re-key the component below to remount
    // when the active conversation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId],
  )

  const { messages, sendMessage, status, error, stop, regenerate, clearError } =
    useChat({
      messages: initialMessages,
      transport,
      onFinish: ({ message }) => {
        if (!activeId) return
        const cm = toChatMessage(message)
        if (cm) dispatch(chatActions.appendMessage({ conversationId: activeId, message: cm }))
      },
    })

  const [input, setInput] = useState("")

  const handleSubmit = useCallback(
    async (msg: { text: string }) => {
      const text = msg.text.trim()
      if (!text || !activeId) return
      // Persist the user message immediately so a refresh mid-stream
      // doesn't lose it. The assistant message is persisted in onFinish.
      dispatch(
        chatActions.appendMessage({
          conversationId: activeId,
          message: { id: uid(), role: "user", content: text, createdAt: Date.now() },
        }),
      )
      setInput("")
      await sendMessage({ text })
    },
    [activeId, dispatch, sendMessage],
  )

  const handleClearConversation = useCallback(() => {
    if (!activeId) return
    dispatch(chatActions.clearMessages(activeId))
    // Force re-mount of useChat by creating a fresh conversation under
    // the same id is overkill; simpler: navigate to a new conversation.
    const newId = uid()
    dispatch(
      chatActions.createConversation({
        id: newId,
        documentId: upload?.id ?? null,
      }),
    )
  }, [activeId, dispatch, upload?.id])

  const handleDocumentChange = useCallback(
    (id: string | null) => {
      if (!activeId) return
      dispatch(chatActions.setDocumentId({ id: activeId, documentId: id }))
    },
    [activeId, dispatch],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <div className="text-sm font-medium">Chat</div>
        <DocumentContextSelect
          value={documentId}
          onChange={handleDocumentChange}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearConversation}
            disabled={messages.length === 0 && status !== "streaming"}
          >
            Clear conversation
          </Button>
        </div>
      </div>

      <Conversation key={activeId ?? "no-conv"}>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={
                upload
                  ? `Ask about “${upload.metadata?.title || upload.name}”`
                  : "Ask anything"
              }
              description={
                upload
                  ? "The document text is sent as context with each message."
                  : "Or pick a document above to chat with its content."
              }
            />
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.role === "assistant" ? (
                    <MessageResponse
                      isAnimating={status === "streaming"}
                      // eslint-disable-next-line react/no-children-prop
                      children={getMessageText(m)}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {getMessageText(m)}
                    </span>
                  )}
                </MessageContent>
              </Message>
            ))
          )}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}

          {error && (
            <Message from="assistant">
              <MessageContent>
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p className="font-medium">Something went wrong</p>
                  <p className="mt-1 break-words">
                    {error.message || "The assistant failed to respond."}
                  </p>
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
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                upload
                  ? `Ask something about “${upload.metadata?.title || upload.name}”…`
                  : "Type a message…"
              }
              disabled={status === "streaming" || status === "submitted"}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
