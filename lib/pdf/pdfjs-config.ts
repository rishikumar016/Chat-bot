"use client"

import { pdfjs } from "react-pdf"

// Resolve the worker as a bundled asset URL.
// Works under Next.js (turbopack/webpack) — they pick up `new URL(...,
// import.meta.url)` at build time and emit the worker as a static asset.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export { pdfjs }
