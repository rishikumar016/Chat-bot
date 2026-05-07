import { openai } from "@ai-sdk/openai"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

export const maxDuration = 60

interface DocumentContext {
  id: string
  title: string
  pageCount: number
  text: string
  truncated: boolean
}

interface ChatPayload {
  messages: UIMessage[]
  documentContext?: DocumentContext | null
}

function buildSystemPrompt(doc: DocumentContext | null | undefined): string {
  if (!doc) {
    return "You are a helpful assistant. Answer concisely. Use markdown for formatting."
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
    "Base your answers on the document content above. If the answer is not in the document, say so clearly. Use markdown for formatting; cite page numbers in the form (p. N) when the source paragraph is identifiable.",
  ].join("\n")
}

export async function POST(req: Request) {
  let payload: ChatPayload
  try {
    payload = (await req.json()) as ChatPayload
  } catch {
    return new Response("Invalid JSON body", { status: 400 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      "OPENAI_API_KEY is not configured on the server.",
      { status: 500 },
    )
  }

  const { messages, documentContext } = payload

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages must be a non-empty array", { status: 400 })
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(documentContext),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
