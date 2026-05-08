# Production-Grade PDF + AI Chat Frontend

> Trinetra Labs — Senior Frontend Assignment
>
> A frontend systems build: token-based auth with silent refresh, off-main-thread
> PDF upload + parsing, virtualized PDF viewer, and a streaming AI chat — all on
> a strict TypeScript Next.js App Router stack with Redux Toolkit.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [End-to-End Flow Diagram](#4-end-to-end-flow-diagram)
5. [Session Lifecycle](#5-session-lifecycle)
6. [State Architecture](#6-state-architecture)
7. [Performance Optimization Strategy](#7-performance-optimization-strategy)
8. [Identified Bottlenecks](#8-identified-bottlenecks)
9. [Future Improvements](#9-future-improvements)
10. [Assignment Requirements → Where We Solved Them](#10-assignment-requirements--where-we-solved-them)
11. [Local Setup](#11-local-setup)

---

## 1. Project Overview

The app has three pillars wired into one Next.js 16 App Router project:

- **Auth** — JWT access token in memory + `httpOnly` refresh cookie, silent
  refresh with a single-flight mutex, server-side route guard via middleware,
  and Suspense-friendly client gating.
- **PDF pipeline** — drop → IndexedDB (bytes) → pdf.js Web Worker (parse) →
  Redux entity adapter (metadata) → virtualized viewer with variable-height
  measurement.
- **AI chat** — Vercel AI SDK with real streaming when `OPENAI_API_KEY` is
  set, deterministic streamed fallback otherwise. Chat history persists
  per-conversation in IndexedDB. Document-aware via just-in-time RAG over
  pre-extracted page text.

The unifying principle is that **nothing big or non-serializable lives in
Redux**. Blobs, `PDFDocumentProxy` instances, and virtualizer measurement caches
all live outside state. Redux holds metadata, IDs, and scalars. That is what
makes selectors stable, what makes `React.memo` work, and what keeps the main
thread free under heavy load.

---

## 2. Tech Stack

| Concern        | Choice                                                          | Why                                                                                   |
| -------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router, Turbopack, PPR)                     | Server components, code-splitting, middleware-based route guard.                      |
| Language       | **TypeScript (strict)**                                         | Required by the brief; eliminates whole classes of runtime bugs.                      |
| Global state   | **Redux Toolkit** + `createEntityAdapter` + listener middleware | Selector-based fine-grained subs; entity adapter avoids list-wide invalidation.       |
| Server state   | **RTK Query** (auth API)                                        | Dedup + cache for `getUser`, `login`, `logout`, `register`.                           |
| HTTP           | **Axios** with request/response interceptors                    | Centralizes Bearer attach + 401 refresh-and-retry.                                    |
| Persistence    | **IndexedDB** via `idb-keyval`                                  | GB-scale quota, native Blob storage, async (off main thread).                         |
| PDF            | **react-pdf** + **pdfjs-dist**                                  | Declarative wrapper; pdf.js worker handles all CPU-bound parsing.                     |
| Virtualization | **@tanstack/react-virtual**                                     | Variable-height rows + `measureElement` correction (zoom/rotate change page heights). |
| Forms          | **react-hook-form** + **Zod**                                   | Typed schema validation, no controlled-input churn.                                   |
| AI             | **Vercel AI SDK** (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)     | First-class streaming primitives + `useChat` with throttling.                         |
| Markdown       | **Streamdown** (`@streamdown/code`, `math`, `mermaid`)          | Streaming-aware markdown render for assistant messages.                               |
| UI primitives  | **shadcn/ui** + **Radix UI** + Tailwind v4                      | Headless, accessible, no design-system overhead.                                      |
| Drag & drop    | **react-dropzone**                                              | Built-in mime + size validation before files enter our code path.                     |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (CLIENT)                                 │
│                                                                             │
│  ┌────────────────┐   ┌──────────────────┐   ┌───────────────────────────┐  │
│  │  Auth UI       │   │  Documents UI    │   │  Chat UI                  │  │
│  │  sign-in /     │   │  dropzone, list, │   │  conversation list,       │  │
│  │  sign-up forms │   │  viewer toolbar  │   │  message stream view      │  │
│  └───────┬────────┘   └────────┬─────────┘   └─────────────┬─────────────┘  │
│          │                     │                           │                │
│          ▼                     ▼                           ▼                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Redux Toolkit Store                          │    │
│  │   ┌───────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  ┌───────────┐    │    │
│  │   │ auth  │  │ authApi │  │ uploads │  │ viewer │  │   chat    │    │    │
│  │   │ slice │  │  (RTKQ) │  │ (entity │  │  slice │  │  (entity  │    │    │
│  │   │       │  │         │  │ adapter)│  │        │  │  adapter) │    │    │
│  │   └───┬───┘  └────┬────┘  └────┬────┘  └───┬────┘  └─────┬─────┘    │    │
│  │       │           │            │           │             │          │    │
│  │       │     ┌─────┴────────────┴───────────┴─────────────┘          │    │
│  │       │     │            Listener Middlewares                       │    │
│  │       │     │  (uploads → IDB persist; chat → IDB persist;          │    │
│  │       │     │   auth/logout → wipe IDB; auth/reset → soft reset)    │    │
│  │       │     └───────────────────────┬───────────────────────────────│    │
│  └───────┼─────────────────────────────┼────────────────────────────────┘   │
│          │                             │                                    │
│          ▼                             ▼                                    │
│   ┌───────────────┐           ┌────────────────────────┐                    │
│   │  api-client   │           │    IndexedDB           │                    │
│   │  (axios +     │           │  ┌──────────────────┐  │                    │
│   │  interceptors │           │  │ pdf-uploads/blobs│  │  bytes             │
│   │  + mutex)     │           │  ├──────────────────┤  │                    │
│   └───────┬───────┘           │  │ pdf-meta/items   │  │  metadata          │
│           │                   │  ├──────────────────┤  │                    │
│           │                   │  │ pdf-text/pages   │  │  per-page text     │
│           │                   │  ├──────────────────┤  │                    │
│           │                   │  │ chat/conversations│ │  history           │
│           │                   │  └──────────────────┘  │                    │
│           │                   └────────────────────────┘                    │
│           │                                                                 │
│           │              ┌──────────────────────────────┐                   │
│           │              │    Web Worker (pdf.worker)   │                   │
│           │              │  getDocument, getPage,       │                   │
│           │              │  getTextContent, render      │                   │
│           │              └──────────────────────────────┘                   │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER (same origin)                           │
│                                                                             │
│   proxy.ts (middleware)  ──── checks refreshToken cookie ──── redirects     │
│                                                                             │
│   /api/auth/login        ──── proxies to Express, captures Set-Cookie       │
│   /api/auth/refresh-token ─── reads cookie, refreshes, rotates              │
│   /api/auth/logout       ──── blacklists token, clears cookie               │
│   /api/auth/get-user     ──── forwards Bearer token                         │
│   /api/auth/register     ──── proxies                                       │
│   /api/chat              ──── streamText (OpenAI) or simulated SSE stream   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
                       ┌──────────────────────────┐
                       │   Express Backend        │
                       │   issues + verifies JWTs │
                       └──────────────────────────┘
```

**Why a proxy layer (`/api/auth/*`)?**

- Single-origin → cookies "just work" (no `SameSite=None`, no preflight).
- Backend URL is never shipped to the browser bundle.
- `httpOnly` refresh cookie is set on the Next.js domain, isolating it from JS.

---

## 4. End-to-End Flow Diagram

### 4.1 Upload → Parse → Open

```
User drops PDF
     │
     ▼
react-dropzone validates (mime=application/pdf, size ≤ 100MB)
     │
     ▼
startUpload() thunk
     │
     ├─► generate UUID → addUpload({ id, name, size, status: "parsing" })
     │      (entity lands in Redux WITHOUT bytes)
     │
     ├─► file.arrayBuffer()             ← async, off main thread
     │
     ├─► IDB put("pdf-uploads/blobs", id, blob)   ← bytes persisted
     │
     ├─► parsePdfBuffer(buffer)
     │      │
     │      ▼
     │    pdfjs.getDocument({ data })  ──postMessage──► pdf.worker (parses)
     │                                  ◄──numPages────
     │      loop pages 1..N:           ──postMessage──► pdf.worker
     │                                  ◄──pageInfo + textContent──
     │      doc.destroy()              ──postMessage──► pdf.worker
     │
     ├─► setMetadata({ id, pageCount, pageDims })
     │      └─► listener writes meta → IDB "pdf-meta/items"
     │      └─► listener writes per-page text → IDB "pdf-text/pages"
     │
     └─► UploadRow flips "Parsing…" → "Open"   (only THIS row re-renders)
```

### 4.2 Viewer

```
User clicks "Open"
     │
     ▼
next/dynamic("@/components/viewer", { ssr: false })  ← code-split chunk
     │
     ▼
getPdfBlob(id) → buffer → <Document file={{ data: Uint8Array }}>
     │
     ▼
useVirtualizer({ count: numPages, estimateSize, measureElement, overscan: 2 })
     │
     ▼
Render only ~5 <PageRow memo>  (visible + 2 overscan each side)
     │
     ▼
Scroll → rAF-throttled handler → setCurrentPage(n) only on index change
     │
     ▼
Toolbar reads selectCurrentPage (scalar) → only Toolbar re-renders, never list
```

### 4.3 Chat (with optional document RAG)

```
User submits message  (optional: attached document id)
     │
     ▼
useChat()  (Vercel AI SDK, experimental_throttle: 50ms)
     │
     ├─► If attachment: chat/rag.ts reads "pdf-text/pages" from IDB,
     │     concatenates with [Page N] markers, truncates at ~80K chars,
     │     injects as system prompt.
     │
     ▼
POST /api/chat
     │
     ├─► OPENAI_API_KEY set?
     │      ├─ yes → streamText("gpt-4o-mini") → toUIMessageStreamResponse()
     │      └─ no  → createUIMessageStream() → simulated text-delta @ ~30 tok/s
     │
     ▼
SSE stream → useChat throttles UI updates @ 20fps
     │
     ▼
Only the streaming MessageItem re-renders
(older messages: React.memo + content-visibility: auto)
     │
     ▼
listener middleware persists conversation to IDB on each message tick
```

---

## 5. Session Lifecycle

The brief calls session handling out as a **high-priority** evaluation area.
Implementation lives in [lib/api-client.ts](lib/api-client.ts),
[lib/store/auth-slice.ts](lib/store/auth-slice.ts),
[lib/store/auth-api.ts](lib/store/auth-api.ts),
[components/auth/session-provider.tsx](components/auth/session-provider.tsx),
[components/auth/protected-shell.tsx](components/auth/protected-shell.tsx),
and [proxy.ts](proxy.ts).

### 5.1 Bootstrap (cold load on `/dashboard`)

```
[1] proxy.ts (Next.js middleware, server-side)
    ├─ refreshToken cookie present? ──── yes → continue
    └─ no                              ──── 307 → /sign-in

[2] HTML + JS arrive
    Redux: { auth: { accessToken: null, user: null, isHydrated: false } }

[3] SessionProvider mounts (client, runs once via useRef guard)
    └─ getNewToken()
        └─ POST /api/auth/refresh-token
            └─ Next route reads cookie → calls Express
            └─ Express returns new accessToken + rotates refresh cookie
        └─ dispatch(setAccessToken(token))
        └─ dispatch(setHydrated(true))

[4] dashboard/layout.tsx renders inside <Suspense fallback={<NavSkeleton/>}>
    ProtectedShell → useGetUserQuery() (enabled: !!accessToken)
        └─ GET /api/auth/get-user (Bearer attached by interceptor)
        └─ Express returns user → cached by RTK Query

[5] App renders. Skeleton disappears. No flash, no premature redirect.
```

### 5.2 Silent refresh (mid-session 401)

```
component → apiClient.get('/anything')
    └─ 401 →  response interceptor
                ├─ originalRequest.url includes '/auth/refresh-token'?  ─yes→ reject (loop guard)
                ├─ originalRequest._retry?                              ─yes→ reject (retry guard)
                └─ otherwise:
                    _retry = true
                    token = await getNewToken()       ← MUTEX
                    headers.Authorization = Bearer ${token}
                    return apiClient(originalRequest) ← retry once
```

**The mutex (single-flight refresh):**

```ts
let refreshPromise: Promise<string> | null = null

export function getNewToken() {
  if (refreshPromise) return refreshPromise        // <-- N callers, 1 network call
  refreshPromise = axios
    .post('/api/auth/refresh-token')
    .finally(() => { refreshPromise = null })      // <-- nulls so next 401 can refresh again
  return refreshPromise
}
```

If 5 requests 401 in parallel, only **one** `/refresh-token` call happens; the
other 4 await the same promise. This eliminates the thundering-herd race that
would otherwise invalidate the rotated refresh token.

### 5.3 Two distinct exit actions

The auth slice exports **two** termination actions, used in different contexts:

- `auth/reset` — soft reset (refresh failed, network blip, transient). Triggers
  redirect, but listener middlewares **do not** wipe IndexedDB.
- `auth/logout` — explicit user intent. Listener middlewares wipe upload IDB,
  chat IDB, and reset module-level hydration flags so the next user starts clean.

This distinction matters: a flaky network shouldn't nuke a user's local PDFs and
chat history.

### 5.4 Race / leak / staleness audit

| Hazard                                         | Mitigation                                         | Where                                  |
| ---------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| Concurrent 401s → multiple refreshes           | Module-level `refreshPromise` mutex                | `lib/api-client.ts`                    |
| Infinite refresh loops                         | `_retry` flag + URL guard on `/auth/refresh-token` | `lib/api-client.ts`                    |
| Double SessionProvider bootstrap (strict mode) | `useRef` flag                                      | `components/auth/session-provider.tsx` |
| Stale token captured in closure                | Read from store via `getState()` per request       | `lib/api-client.ts`                    |
| Premature `useGetUserQuery` fire               | `enabled: !!accessToken`                           | `lib/store/auth-api.ts`                |
| Memory leak from per-render axios instances    | Single module-level instance                       | `lib/api-client.ts`                    |
| Cross-tab ghost session                        | (gap) — see Future Improvements                    | —                                      |

---

## 6. State Architecture

Five state domains, each with one job:

| Slice     | Library                     | Lives in                        | Persists         | Re-render scope                     |
| --------- | --------------------------- | ------------------------------- | ---------------- | ----------------------------------- |
| `auth`    | RTK                         | Memory only                     | No (cookie does) | Components reading token/user       |
| `authApi` | RTK Query                   | Cache                           | No               | Subscribers of `getUser`, etc.      |
| `uploads` | RTK + `createEntityAdapter` | Memory + IDB (`pdf-meta/items`) | Yes              | Per-row via `selectUploadById`      |
| `viewer`  | RTK                         | Memory                          | No               | Toolbar (page/scale/rotate scalars) |
| `chat`    | RTK + `createEntityAdapter` | Memory + IDB (per-conversation) | Yes              | Per-conversation, per-message       |

### 6.1 What's NOT in Redux (and why)

| Value                               | Lives in                              | Why not Redux                                                      |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| 100MB PDF Blob                      | IndexedDB                             | Serialization cost, reference invalidation, JS heap pressure.      |
| `PDFDocumentProxy`                  | react-pdf internal context            | Non-serializable; lifecycle tied to mount.                         |
| Virtualizer measurement cache       | DOM/refs in `@tanstack/react-virtual` | Pure UI computation, not shared.                                   |
| Streaming token chunks (mid-stream) | `useChat` internal state              | Throttled to 50ms; Redux would re-render the whole list per chunk. |

### 6.2 How "no global state invalidation" is enforced

Three layered techniques:

1. **`createEntityAdapter`** — uploads and conversations use ID-keyed normalized
   state. Updating one entity preserves sibling references. Combined with
   `selectById(id)` and `React.memo` on row components, only the changed row
   re-renders.
2. **Scalar selectors** — toolbar reads `selectCurrentPage`, `selectScale`,
   `selectRotation`. Each returns a primitive. React's `===` comparison short-
   circuits unrelated updates.
3. **Side-effects via listener middleware, not reducers** — IDB writes happen
   in `addListener({ matcher, effect })` blocks. Reducers stay pure, so state
   shape never accidentally changes due to I/O.

### 6.3 Slice diagram

```
store
├── auth        → { accessToken, user, isHydrated }
├── authApi     → RTK Query cache
├── uploads     → entities + ids, ordered by createdAt
│   └── (listener) → IDB pdf-meta/items, IDB pdf-text/pages
├── viewer      → { currentPage, scale, rotation, pendingJump }
└── chat        → entities + ids of conversations, activeId
    └── (listener) → IDB chat/conversations[id]
```

`viewer.pendingJump` deserves a note: toolbar jumps and scroll-derived current
page would feed back into each other if naively coupled. Splitting them gives
**one-shot** semantics — toolbar sets `pendingJump`, viewport consumes and
clears it. No loop.

---

## 7. Performance Optimization Strategy

### 7.1 Main thread hygiene

- **All PDF parsing runs on `pdf.worker.mjs`** via `new URL(...,
import.meta.url)` (Turbopack-bundled static asset). Main thread does message
  dispatch only.
- **`file.arrayBuffer()` and IDB writes are async**, scheduled on browser
  background threads. Main thread idle during 100MB reads.
- **`next/dynamic({ ssr: false })`** for the viewer — `react-pdf` and
  `pdfjs-dist` ship in their own chunk, only loaded when a doc opens.
- **Lazy `await import` of pdf.js inside the parser** — keeps SSR pre-render
  free of `DOMMatrix` (browser-only global).

### 7.2 Render minimization

- **Entity adapters + `selectById` + `React.memo`** on `UploadRow`, `PageRow`,
  `MessageItem`, `ConversationItem`.
- **Scalar selectors** for toolbar / scroll-driven state.
- **rAF-throttled scroll handler** in `components/viewer/viewport.tsx` —
  dispatches `setCurrentPage(n)` **only when the integer index actually
  changes**. Scrolling within one page emits 0 actions.
- **`experimental_throttle: 50`** on `useChat` — caps streaming UI updates at
  20fps; older messages don't re-render at all during a stream.
- **`content-visibility: auto`** on chat message wrappers — browser skips
  layout/paint for off-screen messages.

### 7.3 Memory bounding

- **Virtualization (`@tanstack/react-virtual`)** — at most ~5 `<Page>` mounted
  for any document size, regardless of page count.
- **`measureElement` correction** — initial estimate from sampled page dims
  during upload; corrected to real `getBoundingClientRect().height` on actual
  mount. Total scroll height converges as the user scrolls.
- **IndexedDB instead of localStorage** for blobs (5MB cap would block 100MB
  files) and chat history (long conversations with code blocks blow 5MB).

### 7.4 Network minimization

- **Single-flight refresh mutex** — N concurrent 401s → 1 refresh request.
- **RTK Query dedup** — N components calling `useGetUserQuery()` → 1 network
  request, shared cache.
- **No bytes over the wire for PDFs** — `<Document file={{ data: Uint8Array }}>`
  consumes the buffer we already have in memory; no `url:` round-trip.

### 7.5 Bundle splitting

- Auth pages, dashboard, documents list, and viewer are all separate chunks.
- The viewer (heaviest) ships **only** when navigated to.
- Suspense boundary in `app/dashboard/layout.tsx` lets PPR statically prerender
  the sidebar shell while streaming the auth-gated content client-side.

### 7.6 Verification

- React DevTools Profiler → "Highlight updates": dropping a file flashes only
  that row; scrolling flashes only the visible page rows; streaming flashes
  only the currently-streaming `MessageItem`.
- Performance tab → upload a 50MB PDF: main thread mostly idle, parsing visible
  in `pdf.worker` flame graph, no Long Tasks > 50ms, frames stay at 60fps.

---

## 8. Identified Bottlenecks

Honest list of where the system would strain under load, and what we'd
measure to confirm.

| #   | Bottleneck                                                                     | Symptom                                                                                                                                 | How to measure                                                | Severity                   |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| 1   | **Eager per-page text extraction at upload**                                   | 1000-page PDFs spend several seconds parsing text upfront, even if user never chats with the doc.                                       | Performance trace of `parsePdfBuffer` on a 1k-page book.      | Medium                     |
| 2   | **Zoom triggers immediate re-raster**                                          | Hammering +/− on zoom drops a frame on each commit (pdf.js re-rasterizes pages at the new scale).                                       | DevTools FPS meter while scrubbing zoom.                      | Medium                     |
| 3   | **Full-text RAG is O(N) and capped at 80K chars**                              | Long documents get truncated; chat answers may miss content past the cap.                                                               | Truncation flag in the system prompt + manual content checks. | Medium                     |
| 4   | **No request hashing / dedup on uploads**                                      | Same file dropped twice creates two entities.                                                                                           | Deterministic UI test.                                        | Low                        |
| 5   | **Chat message list uses `content-visibility: auto`, not true virtualization** | At 1000+ messages, scroll-back has noticeable jank on first paint of off-screen blocks.                                                 | Profiler scroll trace on a long convo.                        | Low                        |
| 6   | **Cross-tab sync absent**                                                      | Logging out in tab A leaves tab B with a stale access token until its next 401.                                                         | Manual two-tab test.                                          | Low                        |
| 7   | **Eager hydration flag in upload thunk**                                       | Hydration flag is module-scoped — survives HMR but resets on real reload as expected. Edge case: rapid mount/unmount under strict mode. | Strict-mode mount log.                                        | Trivial                    |
| 8   | **OpenAI usage uncapped**                                                      | A long doc + verbose history can balloon prompt tokens.                                                                                 | Server-side token counter (not yet wired).                    | Medium when key is present |

---

## 9. Future Improvements

Roughly in priority order.

1. **Lazy text extraction.** Defer per-page `getTextContent()` to first chat
   submit instead of upload. Trades sub-second upload latency for sub-second
   first-chat latency, with simpler upload invariants.
2. **Embeddings-based RAG.** Replace 80K-char concatenation with chunked
   embeddings + vector search. Necessary for >100-page documents.
3. **Debounced zoom + transform overlay.** Apply a CSS `transform: scale()` for
   in-flight zoom feedback at 60fps; commit the new scale ~150ms after the last
   wheel/pinch event for the real re-raster.
4. **Hash-based upload dedup.** SHA-256 the buffer; same file → same id →
   `upsertOne` instead of duplicate entity.
5. **Real chat virtualization** with `@tanstack/react-virtual` for very long
   conversations.
6. **Cross-tab session sync** via `BroadcastChannel('auth')`. Logout in tab A
   triggers `auth/logout` in all other tabs.
7. **Proactive token refresh.** Decode JWT, schedule refresh ~60s before `exp`.
   Eliminates the user-visible cost of the first 401 on a stale token.
8. **Toast / notification system** for upload errors, quota-exceeded recovery,
   and chat-stream failures.
9. **Tests.** Vitest for slices/thunks (especially refresh-mutex race paths),
   RTL for components, Playwright for the full auth + upload + chat flow.
10. **Telemetry.** Log Long Tasks, slow renders, refresh failures so
    regressions are visible.
11. **Page thumbnails sidebar** rendered via `OffscreenCanvas` in a worker.
12. **Production hardening** — quota-exceeded UX, download/export, in-doc
    search (re-enable text layer + use pdfjs `getTextContent`).

---

## 10. Assignment Requirements → Where We Solved Them

| Requirement                                     | Solution                                                                                       | Files                                                                                                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth — login / register / logout**            | RTK Query mutations + react-hook-form + Zod                                                    | [lib/store/auth-api.ts](lib/store/auth-api.ts), [components/auth/sign-in-form.tsx](components/auth/sign-in-form.tsx), [components/auth/sign-up-form.tsx](components/auth/sign-up-form.tsx) |
| **Token-based auth model**                      | JWT access (15m) + JWT refresh (7d, `httpOnly`)                                                | [proxy.ts](proxy.ts), [app/api/auth](app/api/auth)                                                                                                                                         |
| **Secure session persistence**                  | `httpOnly; SameSite=lax; Secure` refresh cookie on Next.js domain; access token in memory only | [app/api/auth/login/route.ts](app/api/auth/login/route.ts)                                                                                                                                 |
| **Protected routes**                            | Server middleware + client-side `<ProtectedShell>` Suspense gate                               | [proxy.ts](proxy.ts), [components/auth/protected-shell.tsx](components/auth/protected-shell.tsx)                                                                                           |
| **Automatic session restoration on refresh**    | `<SessionProvider>` calls `getNewToken()` once at mount                                        | [components/auth/session-provider.tsx](components/auth/session-provider.tsx)                                                                                                               |
| **Token expiration handling**                   | 401 response interceptor → mutex refresh → retry once                                          | [lib/api-client.ts](lib/api-client.ts)                                                                                                                                                     |
| **Silent token refresh**                        | Module-scoped `refreshPromise` single-flight                                                   | [lib/api-client.ts](lib/api-client.ts)                                                                                                                                                     |
| **Request queueing during refresh**             | All concurrent callers `await` the same `refreshPromise`                                       | [lib/api-client.ts](lib/api-client.ts)                                                                                                                                                     |
| **Prevention of infinite refresh loops**        | `_retry` flag + `/auth/refresh-token` URL guard                                                | [lib/api-client.ts](lib/api-client.ts)                                                                                                                                                     |
| **Centralized auth state**                      | Single Redux slice, accessed via selectors                                                     | [lib/store/auth-slice.ts](lib/store/auth-slice.ts)                                                                                                                                         |
| **Clean separation auth vs UI state**           | `auth` slice holds only `{ accessToken, user, isHydrated }`; UI slices are separate            | [lib/store/index.ts](lib/store/index.ts)                                                                                                                                                   |
| **Avoid full app re-render on token update**    | Scalar selectors; interceptor reads via `getState()` not closure                               | [lib/api-client.ts](lib/api-client.ts)                                                                                                                                                     |
| **Drag-and-drop PDF upload**                    | `react-dropzone` with mime + 100MB validation                                                  | [upload/components/dropzone.tsx](upload/components/dropzone.tsx)                                                                                                                           |
| **Off-main-thread parsing**                     | pdf.js worker via `new URL(..., import.meta.url)`                                              | [lib/pdf/pdfjs-config.ts](lib/pdf/pdfjs-config.ts), [upload/worker/parser-client.ts](upload/worker/parser-client.ts)                                                                       |
| **Raw bytes / metadata / UI separation**        | IDB blobs / IDB meta + Redux entity / row component                                            | [upload/storage.ts](upload/storage.ts), [upload/slice.ts](upload/slice.ts), [upload/components/upload-row.tsx](upload/components/upload-row.tsx)                                           |
| **No global state invalidation on file update** | `createEntityAdapter` + `selectUploadById` + `React.memo`                                      | [upload/slice.ts](upload/slice.ts), [upload/components/upload-row.tsx](upload/components/upload-row.tsx)                                                                                   |
| **Persistent uploads across reload**            | Listener writes meta to IDB; `<UploadsHydrator>` restores at bootstrap                         | [upload/listener.ts](upload/listener.ts), [upload/components/uploads-hydrator.tsx](upload/components/uploads-hydrator.tsx)                                                                 |
| **Corrupted / password-protected PDF handling** | Typed error codes (`password`, `corrupted`, `unknown`) → friendly UI                           | [upload/worker/parser-client.ts](upload/worker/parser-client.ts)                                                                                                                           |
| **Memory-bounded viewer (500+ pages)**          | `@tanstack/react-virtual`, overscan 2, ~5 pages mounted                                        | [components/viewer/viewport.tsx](components/viewer/viewport.tsx)                                                                                                                           |
| **Variable-height pages with zoom/rotate**      | `estimateSize` from sampled dims + `measureElement` correction                                 | [components/viewer/viewport.tsx](components/viewer/viewport.tsx)                                                                                                                           |
| **Avoid re-render on page change**              | Scalar `selectCurrentPage`; rAF-throttled scroll; `<PageRow>` memo                             | [components/viewer/viewport.tsx](components/viewer/viewport.tsx), [components/viewer/page-row.tsx](components/viewer/page-row.tsx)                                                         |
| **Code-split viewer**                           | `next/dynamic({ ssr: false })`                                                                 | [app/dashboard/documents/\[id\]/page.tsx](app/dashboard/documents/[id]/page.tsx)                                                                                                           |
| **AI chat with streaming response**             | Vercel AI SDK; real OpenAI when key set, simulated SSE otherwise                               | [app/api/chat/route.ts](app/api/chat/route.ts), [chat/components/conversation-view.tsx](chat/components/conversation-view.tsx)                                                             |
| **Document-aware chat**                         | Just-in-time RAG: read pre-extracted page text from IDB → system prompt                        | [chat/rag.ts](chat/rag.ts)                                                                                                                                                                 |
| **Persistent chat history**                     | Per-conversation IDB writes via listener middleware                                            | [chat/listener.ts](chat/listener.ts), [chat/storage.ts](chat/storage.ts)                                                                                                                   |
| **No re-render of full convo on stream**        | `experimental_throttle: 50` + `React.memo` on `MessageItem` + `content-visibility: auto`       | [chat/components/conversation-view.tsx](chat/components/conversation-view.tsx), [chat/components/message-item.tsx](chat/components/message-item.tsx)                                       |

---

## 11. Local Setup

```powershell
# from frontend/
pnpm install
cp .env.example .env.local      # set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
                                # optionally set OPENAI_API_KEY for real chat
pnpm dev                        # http://localhost:3000
```

The Express backend lives in `../backend` and must be running (`pnpm dev` in
that folder) for auth to work. Without `OPENAI_API_KEY`, the chat falls back
to a deterministic streamed SSE response so reviewers can still see streaming
UX end-to-end.

### Environment variables

| Var                       | Required | Used for                                                |
| ------------------------- | -------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_BACKEND_URL` | yes      | Express base URL (proxied server-side)                  |
| `OPENAI_API_KEY`          | optional | Real `gpt-4o-mini` streaming; absent → simulated stream |

### Scripts

| Command          | Purpose                     |
| ---------------- | --------------------------- |
| `pnpm dev`       | Next dev server (Turbopack) |
| `pnpm build`     | Production build            |
| `pnpm start`     | Production server           |
| `pnpm lint`      | ESLint                      |
| `pnpm typecheck` | `tsc --noEmit`              |
| `pnpm format`    | Prettier write              |
