export type UploadStatus = "queued" | "parsing" | "ready" | "error"

export type ParseErrorCode =
  | "corrupted"
  | "password"
  | "quota"
  | "io"
  | "unknown"

export interface PdfPageDim {
  width: number
  height: number
}

export interface PdfMetadata {
  pageCount: number
  title?: string
  author?: string
  pageDims: PdfPageDim[]
}

export interface PdfPageText {
  pageNumber: number
  text: string
}

export interface ParsedPdf {
  metadata: PdfMetadata
  pages: PdfPageText[]
}

export interface ParseError {
  code: ParseErrorCode
  message: string
}
