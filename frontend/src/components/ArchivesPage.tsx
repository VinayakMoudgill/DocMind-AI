'use client'

import React, { useState, useRef, useCallback } from 'react'
import { UploadCloud, CheckCircle, XCircle, Loader } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface ArchivesPageProps {
  onDocumentsUploaded: (docs: any[]) => void
  documents: any[]
}

interface ThreadEntry {
  id: string
  filename: string
  status: 'uploading' | 'success' | 'error'
  chunks?: number
  error?: string
}

export function ArchivesPage({ onDocumentsUploaded, documents }: ArchivesPageProps) {
  const [dragging, setDragging] = useState(false)
  const [threads, setThreads] = useState<ThreadEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files)
      if (!arr.length) return

      const newThreads: ThreadEntry[] = arr.map((f) => ({
        id: Math.random().toString(36).slice(2),
        filename: f.name,
        status: 'uploading',
      }))
      setThreads((prev) => [...newThreads, ...prev])

      const formData = new FormData()
      arr.forEach((f) => formData.append('files', f))

      try {
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || 'Upload failed')

        const uploaded =
          data.documents?.length
            ? data.documents.map((d: any) => ({
                id: d.id,
                name: d.name || d.filename,
                chunks: d.chunks || d.chunks_count || 0,
              }))
            : (data.document_ids as string[]).map((id: string, i: number) => ({
                id,
                name: arr[i]?.name || id,
                chunks: Math.floor(
                  (data.chunks_ingested || 0) / Math.max(data.document_ids.length, 1)
                ),
              }))

        onDocumentsUploaded(uploaded)

        setThreads((prev) =>
          prev.map((t) => {
            const match = uploaded.find((u: any) =>
              arr.some((f) => f.name === t.filename && u.name === f.name)
            )
            if (newThreads.find((nt) => nt.id === t.id)) {
              return {
                ...t,
                status: 'success',
                chunks: match?.chunks ?? data.chunks_ingested ?? 0,
              }
            }
            return t
          })
        )
      } catch (e: any) {
        setThreads((prev) =>
          prev.map((t) =>
            newThreads.find((nt) => nt.id === t.id)
              ? { ...t, status: 'error', error: e?.message || 'Upload failed' }
              : t
          )
        )
      }
    },
    [onDocumentsUploaded]
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const activeThreads = threads.filter((t) => t.status === 'uploading')
  const queuedDocs = documents.slice(0, 3)

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Full nebula background */}
      <div className="nebula-bg">
        <div className="stars-bg" />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,0.18) 0%, rgba(249,115,22,0.12) 50%, transparent 80%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(180,80,200,0.25) 0%, rgba(249,115,22,0.15) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 1 }}>
        <h1
          className="font-display"
          style={{
            fontSize: '52px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '10px',
            textShadow: '0 0 60px rgba(124,58,237,0.4)',
          }}
        >
          The Ingestion Terminal
        </h1>
        <p
          className="font-mono"
          style={{
            fontSize: '11px',
            letterSpacing: '0.25em',
            color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase',
          }}
        >
          Awakening Digital Consciousness
        </p>
      </div>

      {/* Center: Drop zone + side panels */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          zIndex: 1,
        }}
      >
        {/* Left icon btn */}
        <div
          className="btn-icon"
          style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(10,10,24,0.8)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.8)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        {/* Circle drop zone */}
        <div
          className={`upload-circle ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          id="upload-drop-zone"
        >
          {activeThreads.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Loader size={36} style={{ color: '#a78bfa', animation: 'spin-slow 2s linear infinite' }} />
              <span
                className="font-mono"
                style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}
              >
                Ingesting...
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <UploadCloud size={40} style={{ color: 'rgba(167,139,250,0.9)' }} />
              <div style={{ textAlign: 'center' }}>
                <p
                  className="font-mono"
                  style={{ fontSize: '12px', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: '6px' }}
                >
                  Drop Fragments
                </p>
                <div
                  style={{
                    width: '40px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent)',
                    margin: '0 auto',
                  }}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', maxWidth: '140px' }}>
                PDF · DOCX · MP4 · CSV · TXT
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.mp4,.csv,.txt"
            onChange={(e) => e.target.files && processFiles(e.target.files)}
            id="archive-file-input"
            style={{ display: 'none' }}
          />
        </div>

        {/* Right side — thread status cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
          {threads.length === 0 && queuedDocs.length === 0 ? (
            <>
              <div className="thread-card" style={{ opacity: 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="thread-label">THREAD_ALPHA</span>
                  <span className="thread-status-active">Idle</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block' }} />
                  Awaiting fragments...
                </p>
              </div>
              <div className="thread-card" style={{ opacity: 0.35 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="thread-label">THREAD_GAMMA</span>
                  <span className="thread-status-queued">Queued</span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(249,115,22,0.4)', flexShrink: 0, display: 'inline-block' }} />
                  Vector mapping awaiting sync...
                </p>
              </div>
            </>
          ) : (
            threads.slice(0, 4).map((t, i) => (
              <div className="thread-card animate-fade-in" key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="thread-label">
                    {i === 0 ? 'THREAD_ALPHA' : i === 1 ? 'THREAD_GAMMA' : `THREAD_${String.fromCharCode(68 + i)}`}
                  </span>
                  {t.status === 'uploading' && <span className="thread-status-active">Active</span>}
                  {t.status === 'success' && <span className="thread-status-active">Done</span>}
                  {t.status === 'error' && (
                    <span className="font-mono" style={{ fontSize: '9px', color: '#f87171', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Failed
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {t.status === 'uploading' && (
                    <Loader size={12} style={{ color: '#22c55e', flexShrink: 0, animation: 'spin-slow 2s linear infinite' }} />
                  )}
                  {t.status === 'success' && <CheckCircle size={12} style={{ color: '#22c55e', flexShrink: 0 }} />}
                  {t.status === 'error' && <XCircle size={12} style={{ color: '#f87171', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.status === 'uploading' && 'Entity extraction in progress...'}
                    {t.status === 'success' && `${t.chunks ?? 0} chunks indexed`}
                    {t.status === 'error' && (t.error || 'Upload failed')}
                  </span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
