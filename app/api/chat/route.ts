import { openai } from "@ai-sdk/openai"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai"

export const maxDuration = 60

interface AttachmentPayload {
  id: string
  title: string
  pageCount: number
  text?: string
  truncated?: boolean
}

interface ChatPayload {
  messages: UIMessage[]
  attachment?: AttachmentPayload | null
}

function buildSystemPrompt(doc: AttachmentPayload | null | undefined): string {
  if (!doc) {
    return "You are a helpful assistant. Be concise and clear. Use markdown for formatting."
  }
  if (!doc.text) {
    // Metadata-only attachment (text extraction failed or empty).
    return [
      "You are a helpful assistant. The user has attached a document but no",
      "text content was extracted (likely an image-only PDF). Acknowledge",
      `the document by name and ask the user to provide the relevant text.`,
      "",
      `Attached: "${doc.title}" (${doc.pageCount} pages)`,
    ].join("\n")
  }
  return [
    "You are a helpful assistant answering questions about a specific document.",
    "",
    `Document: "${doc.title}" (${doc.pageCount} pages)${doc.truncated ? " [content truncated to fit context window]" : ""}`,
    "",
    "--- DOCUMENT CONTENT ---",
    doc.text,
    "--- END DOCUMENT ---",
    "",
    "Ground your answers in the document content above. If the answer is",
    "not in the document, say so clearly. Use markdown for formatting and",
    "cite page numbers in the form (p. N) when the source paragraph is",
    "identifiable.",
  ].join("\n")
}

export async function POST(req: Request) {
  let payload: ChatPayload
  try {
    payload = (await req.json()) as ChatPayload
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  const { messages, attachment } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages must be a non-empty array", { status: 400 })
  }

  // Real OpenAI path — used when the env var is configured.
  if (process.env.OPENAI_API_KEY) {
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(attachment),
      messages: await convertToModelMessages(messages),
    })
    return result.toUIMessageStreamResponse()
  }

  // Fallback: simulated stream so the UX still works without a key.
  return simulatedResponse(messages, attachment ?? null)
}

// ── Simulated streaming fallback ─────────────────────────────────────

const TEMPLATES_WITH_DOC = [
  (q: string, a: AttachmentPayload) =>
    `Hello — I'm running in **simulated mode** with **${a.title}** attached (${a.pageCount} pages).\n\nYou asked:\n\n> ${truncate(q, 140)}\n\nA real model would respond here with a streamed, document-grounded answer. Set \`OPENAI_API_KEY\` in \`.env.local\` to switch to the real path.`,
]

const TEMPLATES_NO_DOC = [
  (q: string) =>
    `Hello — I'm running in **simulated mode**. You asked:\n\n> ${truncate(q, 140)}\n\nA real model would respond here with a streamed answer. To see grounded responses about a PDF, attach one with the paperclip in the input. To wire in an actual model, set \`OPENAI_API_KEY\` in \`.env.local\`.`,
]

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m || m.role !== "user") continue
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
    if (text) return text
  }
  return "(empty message)"
}

function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [text]
}

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function simulatedResponse(
  messages: UIMessage[],
  attachment: AttachmentPayload | null,
): Response {
  const question = getLastUserText(messages)
  const reply = attachment
    ? TEMPLATES_WITH_DOC[0]!(question, attachment)
    : TEMPLATES_NO_DOC[0]!(question)
  const tokens = tokenize(reply)
  const textId = `t_${Date.now().toString(36)}`

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" })
      writer.write({ type: "text-start", id: textId })
      for (const token of tokens) {
        writer.write({ type: "text-delta", id: textId, delta: token })
        await sleep(20 + Math.random() * 30)
      }
      writer.write({ type: "text-end", id: textId })
      writer.write({ type: "finish" })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
