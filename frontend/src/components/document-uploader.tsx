'use client'

import React, { useRef } from 'react'
import { Upload, Info } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface DocumentUploaderProps {
  onUpload: (documents: any[]) => void
}

export function DocumentUploader({ onUpload }: DocumentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      for (const file of Array.from(files)) {
        formData.append('files', file)
      }

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || response.statusText || 'Upload failed')
      }

      const data = await response.json()
      const fromApi = data.documents as { id: string; name: string; chunks: number }[] | undefined
      const newDocs = fromApi?.length
        ? fromApi.map((d) => ({
          id: d.id,
          name: d.name,
          chunks: d.chunks,
          type: '',
        }))
        : (data.document_ids as string[]).map((id: string, i: number) => {
          const file = files[i]
          return {
            id,
            name: file?.name || id,
            chunks: Math.floor(
              (data.chunks_ingested || 0) / Math.max(data.document_ids.length, 1),
            ),
            type: file?.type,
          }
        })

      onUpload(newDocs)
    } catch (e: any) {
      console.error('Upload error:', e)
      console.error('Error name:', e?.name)
      console.error('Error message:', e?.message)
      console.error('Error cause:', e?.cause)
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="flex flex-col items-center gap-2">
          <Upload size={20} className="text-blue-600 dark:text-blue-400" />
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            PDF, DOCX, MP4, CSV, TXT
          </p>
        </div>
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 px-1">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.mp4,.csv,.txt"
      />

      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50">
        <div className="flex gap-2">
          <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Max file size:</strong> 100 MB per document
          </p>
        </div>
      </div>
    </div>
  )
}
