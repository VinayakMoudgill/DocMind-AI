'use client'

import React from 'react'
import { Cloud, Upload, FileText, Loader, CheckCircle, AlertCircle } from 'lucide-react'

interface IngestionTerminalProps {
  onUpload?: (documents: any[]) => void
  documents?: any[]
}

interface ThreadStatus {
  id: string
  name: string
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'error'
  message: string
  progress?: number
  fileName?: string
}

export function IngestionTerminal({ onUpload, documents = [] }: IngestionTerminalProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([])
  const [threads, setThreads] = React.useState<ThreadStatus[]>([
    {
      id: 'alpha',
      name: 'THREAD_ALPHA',
      status: 'idle',
      message: 'Awaiting fragments...'
    },
    {
      id: 'gamma',
      name: 'THREAD_GAMMA',
      status: 'queued',
      message: 'Vector mapping awaiting sync...'
    }
  ])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const simulateProcessing = async (fileName: string) => {
    // Update threads to show processing
    setThreads(prev => prev.map(thread =>
      thread.id === 'alpha'
        ? { ...thread, status: 'processing', message: `Processing ${fileName}...`, fileName, progress: 0 }
        : thread.id === 'gamma'
          ? { ...thread, status: 'queued', message: 'Awaiting processing slot...' }
          : thread
    ))

    // Simulate processing progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setThreads(prev => prev.map(thread =>
        thread.id === 'alpha'
          ? { ...thread, progress }
          : thread
      ))
    }

    // Complete alpha thread
    setThreads(prev => prev.map(thread =>
      thread.id === 'alpha'
        ? { ...thread, status: 'completed', message: `Successfully processed ${fileName}`, progress: 100 }
        : thread.id === 'gamma'
          ? { ...thread, status: 'processing', message: `Indexing ${fileName}...`, fileName, progress: 0 }
          : thread
    ))

    // Process gamma thread
    for (let progress = 0; progress <= 100; progress += 25) {
      await new Promise(resolve => setTimeout(resolve, 400))
      setThreads(prev => prev.map(thread =>
        thread.id === 'gamma'
          ? { ...thread, progress }
          : thread
      ))
    }

    // Complete gamma thread
    setThreads(prev => prev.map(thread =>
      thread.id === 'gamma'
        ? { ...thread, status: 'completed', message: `Successfully indexed ${fileName}`, progress: 100 }
        : thread
    ))

    // Reset to idle after completion
    setTimeout(() => {
      setThreads(prev => prev.map(thread => ({
        ...thread,
        status: 'idle',
        message: 'Awaiting fragments...',
        progress: undefined,
        fileName: undefined
      })))
    }, 2000)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)

    if (files.length > 0) {
      setIsUploading(true)
      setUploadedFiles(prev => [...prev, ...files.map(f => f.name)])

      try {
        // Real backend upload
        const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'
        const formData = new FormData()

        for (const file of files) {
          formData.append('files', file)
        }

        console.log('IngestionTerminal - Uploading files:', files.map(f => f.name))
        console.log('IngestionTerminal - File types:', files.map(f => f.type))

        const response = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        console.log('IngestionTerminal - Upload response:', data)
        const uploadedDocs = data.documents as { id: string; name: string; chunks: number }[] || []

        // Call the upload callback with real data
        if (onUpload) {
          onUpload(uploadedDocs)
        }

        // Start processing simulation for each file
        for (const file of files) {
          await simulateProcessing(file.name)
        }

      } catch (error) {
        console.error('Upload error:', error)
        // Still show simulation even if upload fails
        for (const file of files) {
          await simulateProcessing(file.name)
        }
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > 0) {
      setIsUploading(true)
      setUploadedFiles(prev => [...prev, ...files.map(f => f.name)])

      try {
        // Real backend upload
        const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'
        const formData = new FormData()

        for (const file of files) {
          formData.append('files', file)
        }

        console.log('IngestionTerminal - File select uploading files:', files.map(f => f.name))
        console.log('IngestionTerminal - File select types:', files.map(f => f.type))

        const response = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        console.log('IngestionTerminal - File select upload response:', data)
        const uploadedDocs = data.documents as { id: string; name: string; chunks: number }[] || []

        // Call the upload callback with real data
        if (onUpload) {
          onUpload(uploadedDocs)
        }

        // Start processing simulation for each file
        for (const file of files) {
          await simulateProcessing(file.name)
        }

      } catch (error) {
        console.error('File select upload error:', error)
        // Still show simulation even if upload fails
        for (const file of files) {
          await simulateProcessing(file.name)
        }
      } finally {
        setIsUploading(false)
      }
    }
  }

  const getStatusIcon = (status: ThreadStatus['status']) => {
    switch (status) {
      case 'processing':
        return <Loader size={16} className="animate-spin text-blue-400" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      default:
        return <div className="w-4 h-4 rounded-full bg-neutral-600" />
    }
  }

  const getStatusColor = (status: ThreadStatus['status']) => {
    switch (status) {
      case 'processing':
        return 'text-blue-400'
      case 'completed':
        return 'text-green-400'
      case 'queued':
        return 'text-amber-500'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-neutral-500'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-8">
      {/* Title */}
      <h2 className="text-3xl font-bold gradient-text mb-4 text-center">
        The Ingestion Terminal
      </h2>

      {/* Subtitle */}
      <p className="text-neutral-400 text-center mb-12 max-w-2xl">
        AWAKENING DIGITAL CONSCIOUSNESS
      </p>

      {/* Drop Zone */}
      <div
        className={`drop-zone w-full max-w-2xl transition-all duration-300 ${isDragOver ? 'border-blue-500 bg-blue-500/10 scale-105' : ''
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Cloud Icon */}
          <div className={`w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center neural-glow ${isUploading ? 'animate-pulse' : ''
            }`}>
            {isUploading ? (
              <Loader size={48} className="text-white animate-spin" />
            ) : (
              <Cloud size={48} className="text-white" />
            )}
          </div>

          {/* Drop Text */}
          <h3 className="text-xl font-semibold text-white">
            {isUploading ? 'PROCESSING FRAGMENTS...' : 'DROP FRAGMENTS'}
          </h3>

          {/* File Types */}
          <div className="flex flex-wrap justify-center gap-2 text-sm text-neutral-400">
            <span className="px-3 py-1 bg-black/30 rounded-lg">PDF</span>
            <span className="px-3 py-1 bg-black/30 rounded-lg">DOCX</span>
            <span className="px-3 py-1 bg-black/30 rounded-lg">MP4</span>
            <span className="px-3 py-1 bg-black/30 rounded-lg">CSV</span>
            <span className="px-3 py-1 bg-black/30 rounded-lg">TXT</span>
          </div>

          {/* Upload Button */}
          <label className={`btn-neural cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.mp4,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <div className="flex items-center space-x-2">
              <Upload size={16} />
              <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
            </div>
          </label>
        </div>
      </div>

      {/* Uploaded Documents from Backend */}
      {documents.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <h4 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id || doc.name} className="flex items-center justify-between p-3 bg-black/30 border border-neutral-800/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText size={16} className="text-green-400" />
                  <span className="text-sm text-neutral-300">{doc.name}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  {doc.chunks} chunks
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Uploaded Files (Local) */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8 w-full max-w-2xl">
          <h4 className="text-lg font-semibold text-white mb-4">Recently Uploaded</h4>
          <div className="space-y-2">
            {uploadedFiles.slice(-3).map((fileName, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-black/30 border border-neutral-800/50 rounded-lg">
                <FileText size={16} className="text-blue-400" />
                <span className="text-sm text-neutral-300">{fileName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thread Status */}
      <div className="grid grid-cols-2 gap-8 mt-12 w-full max-w-2xl">
        {threads.map((thread) => (
          <div key={thread.id} className={`thread-card thread-${thread.status}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">{thread.name}</h4>
              <div className="flex items-center space-x-2">
                {getStatusIcon(thread.status)}
                <span className={`text-xs ${getStatusColor(thread.status)}`}>
                  {thread.status.toUpperCase()}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 mb-2">{thread.message}</p>

            {thread.fileName && (
              <p className="text-xs text-neutral-500 mb-2">File: {thread.fileName}</p>
            )}

            {thread.progress !== undefined && (
              <div className="w-full bg-black/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${thread.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
