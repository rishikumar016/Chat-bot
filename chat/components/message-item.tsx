"use client"

import { memo } from "react"
import { FileTextIcon } from "lucide-react"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import type { ChatAttachment } from "../types"

interface Props {
  id: string
  role: "user" | "assistant" | "system"
  text: string
  isStreaming: boolean
  attachment?: ChatAttachment
}

function MessageItemImpl({ role, text, isStreaming, attachment }: Props) {
  // `system` is shown as assistant-style; we don't expect them in this app.
  const from = role === "user" ? "user" : "assistant"

  return (
    // content-visibility: auto lets the browser skip painting offscreen
    // messages — meaningful for 500+ message conversations.
    <div style={{ contentVisibility: "auto", containIntrinsicSize: "auto 80px" }}>
      <Message from={from}>
        <MessageContent>
          {attachment && from === "user" && (
            <AttachmentChip attachment={attachment} />
          )}
          {from === "assistant" ? (
            <MessageResponse isAnimating={isStreaming}>{text}</MessageResponse>
          ) : (
            <span className="whitespace-pre-wrap">{text}</span>
          )}
        </MessageContent>
      </Message>
    </div>
  )
}

function AttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  return (
    <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-background/80 px-2 py-1 text-xs">
      <FileTextIcon className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{attachment.title}</span>
      <span className="text-muted-foreground">
        · {attachment.pageCount} {attachment.pageCount === 1 ? "page" : "pages"}
      </span>
    </div>
  )
}

// Scalar props + React.memo => streaming token updates only re-render the
// last (currently-streaming) message. Older messages skip re-render
// because their `text` and `isStreaming` references don't change.
export const MessageItem = memo(MessageItemImpl)
MessageItem.displayName = "MessageItem"
