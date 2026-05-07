"use client"

import { useCallback } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { useAppDispatch } from "@/lib/store/hooks"
import { startUpload } from "../slice"
import { ACCEPTED_MIME, MAX_FILE_SIZE } from "../constants"
import { cn } from "@/lib/utils"

export function Dropzone() {
  const dispatch = useAppDispatch()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        dispatch(startUpload(file))
      }
    },
    [dispatch],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: { [ACCEPTED_MIME]: [".pdf"] },
      maxSize: MAX_FILE_SIZE,
      multiple: true,
    })

  return (
    <div className="grid gap-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/50",
        )}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium">
          {isDragActive
            ? "Drop the PDFs here"
            : "Drag & drop PDFs here, or click to select"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          PDF only · max 100&nbsp;MB · multiple files allowed
        </p>
      </div>

      {fileRejections.length > 0 && (
        <ul className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {fileRejections.map(({ file, errors }: FileRejection) => (
            <li key={file.name}>
              <span className="font-medium">{file.name}</span> —{" "}
              {errors[0]?.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
