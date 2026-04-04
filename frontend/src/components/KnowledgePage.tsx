'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, FileText, Trash2, Plus, RefreshCw, Database } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface Doc {
  id: string
  name: string
  chunks: number
  status?: string
  file_type?: string
  created_at?: string
}

interface KnowledgePageProps {
  documents: Doc[]
  onDocumentsUploaded: (docs: Doc[]) => void
  onUploadClick: () => void
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  csv: '📊',
  txt: '📃',
  mp4: '🎬',
}

export function KnowledgePage({ documents, onDocumentsUploaded, onUploadClick }: KnowledgePageProps) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localDocs, setLocalDocs] = useState<Doc[]>(documents)

  useEffect(() => {
    setLocalDocs(documents)
  }, [documents])

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/documents/list`)
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.documents)) {
        const fetched = data.documents.map((d: any) => ({
          id: d.id,
          name: d.filename || d.name,
          chunks: d.chunks_count ?? d.chunks ?? 0,
          status: d.status || 'ready',
          file_type: d.file_type,
          created_at: d.created_at,
        }))
        setLocalDocs(fetched)
        onDocumentsUploaded(fetched)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [onDocumentsUploaded])

  const deleteDoc = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' })
      setLocalDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = localDocs.filter((d) =>
    d.name?.toLowerCase().includes(search.toLowerCase())
  )

  const ext = (name: string) => name?.split('.').pop()?.toLowerCase() || ''

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle bg */}
      <div className="nebula-bg" style={{ opacity: 0.4 }}>
        <div className="stars-bg" />
      </div>

      {/* Header */}
      <div style={{ zIndex: 1, marginBottom: '24px' }}>
        <h1
          className="font-display text-gradient-purple"
          style={{ fontSize: '42px', fontWeight: 700, marginBottom: '20px' }}
        >
          Knowledge Archive
        </h1>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '640px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="knowledge-search"
            className="search-input"
            placeholder="Query the archives..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              CMD
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '2px 6px',
              }}
            >
              K
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span
            className="font-mono"
            style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}
          >
            {filtered.length} DOCUMENT{filtered.length !== 1 ? 'S' : ''} IN ARCHIVE
          </span>
        </div>
        <button
          className="btn-icon"
          onClick={fetchDocs}
          title="Refresh"
          id="knowledge-refresh"
          style={{ border: 'none' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin-slow 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          zIndex: 1,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(124,58,237,0.1)',
                border: '1px solid rgba(124,58,237,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={22} style={{ color: 'rgba(167,139,250,0.6)' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>
              {search ? 'No documents match your query' : 'No documents in archive yet'}
            </p>
            {!search && (
              <button
                className="btn-nebula btn-nebula-primary"
                onClick={onUploadClick}
                id="knowledge-upload-cta"
              >
                <Plus size={14} /> Upload Documents
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              paddingBottom: '24px',
            }}
          >
            {filtered.map((doc, idx) => {
              const fileExt = ext(doc.name)
              const icon = FILE_ICONS[fileExt] || '📄'
              const isDeleting = deletingId === doc.id

              return (
                <div
                  key={doc.id}
                  className="doc-card animate-fade-in"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Card top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(124,58,237,0.12)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <span
                      className="chip chip-purple"
                      style={{ fontSize: '8px' }}
                    >
                      DOCUMENT INTEGRITY
                    </span>
                  </div>

                  {/* Name */}
                  <h3
                    className="font-display"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'white',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.name?.split('.')[0] || 'Document'}
                  </h3>

                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', lineHeight: 1.5 }}>
                    {doc.chunks} chunks indexed · {fileExt.toUpperCase()}
                  </p>

                  {/* Footer */}
                  <div className="divider" style={{ marginBottom: '12px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      className="font-mono"
                      style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}
                    >
                      {doc.status?.toUpperCase() || 'READY'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#a78bfa',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                      >
                        Illuminate →
                      </button>
                      <button
                        className="btn-icon"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '7px',
                          border: 'none',
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                        onClick={() => deleteDoc(doc.id)}
                        disabled={isDeleting}
                        title="Delete document"
                      >
                        <Trash2 size={12} style={{ color: '#f87171' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="fab"
        onClick={onUploadClick}
        id="knowledge-fab"
        style={{ position: 'absolute', bottom: '28px', right: '28px', zIndex: 10 }}
        title="Upload documents"
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
