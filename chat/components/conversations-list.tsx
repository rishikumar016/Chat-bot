"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { memo, useCallback } from "react"
import { MessageSquareIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  chatActions,
  selectActiveConversationId,
  selectAllConversations,
} from "../slice"
import type { Conversation } from "../types"

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function ConversationsList() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()
  const conversations = useAppSelector(selectAllConversations)
  const activeId = useAppSelector(selectActiveConversationId)

  const handleNewChat = useCallback(() => {
    // If there's already an empty conversation, switch to it instead of
    // stacking another empty row. Empty rows promote to titled rows on
    // first user message (see chatActions.appendMessage in slice.ts).
    const empty = conversations.find((c) => c.messages.length === 0)
    if (empty) {
      dispatch(chatActions.setActiveConversation(empty.id))
    } else {
      dispatch(chatActions.createConversation({ id: uid() }))
    }
    if (pathname !== "/dashboard") router.push("/dashboard")
  }, [conversations, dispatch, router, pathname])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Conversations</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleNewChat}
              tooltip="New chat"
              className="text-primary"
            >
              <PlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {conversations.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
            />
          ))}

          {conversations.length === 0 && (
            <SidebarMenuItem>
              <span className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                No conversations yet
              </span>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const ConversationRow = memo(function ConversationRow({
  conversation,
  isActive,
}: {
  conversation: Conversation
  isActive: boolean
}) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const pathname = usePathname()

  const handleSelect = useCallback(() => {
    dispatch(chatActions.setActiveConversation(conversation.id))
    if (pathname !== "/dashboard") router.push("/dashboard")
  }, [conversation.id, dispatch, router, pathname])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dispatch(chatActions.deleteConversation(conversation.id))
    },
    [conversation.id, dispatch]
  )

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={conversation.title}
      >
        <Link href="/dashboard" onClick={handleSelect}>
          <MessageSquareIcon />
          <span className="truncate">{conversation.title}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuAction
        onClick={handleDelete}
        showOnHover
        aria-label="Delete conversation"
      >
        <Trash2Icon />
      </SidebarMenuAction>
    </SidebarMenuItem>
  )
})
