import { Dropzone } from "@/upload/components/dropzone"
import { UploadList } from "@/upload/components/upload-list"

export const metadata = { title: "Documents" }

export default function DocumentsPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 p-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload PDFs to view them. Files are processed in your browser and
          stored locally — they never leave your device.
        </p>
      </div>

      <Dropzone />
      <UploadList />
    </div>
  )
}
