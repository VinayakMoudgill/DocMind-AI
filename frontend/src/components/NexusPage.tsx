'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Zap, FileText, Database, Brain, ChevronRight } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceMap?: any[]
  confidenceScore?: number
  confidenceExplanation?: string
  executionTimeMs?: number
  timestamp: Date
}

interface Source {
  id: string
  file: string
  page?: number
  snippet: string
}

interface NexusPageProps {
  documents: any[]
  conversationId: string
}

export function NexusPage({ documents, conversationId }: NexusPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentSources, setCurrentSources] = useState<Source[]>([])
  const [currentConfidence, setCurrentConfidence] = useState<number | null>(null)
  const [currentExplanation, setCurrentExplanation] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuery = async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
          document_ids: documents.map((d) => d.id).filter(Boolean),
          use_nli_validation: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Query failed')

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || '',
        sourceMap: data.source_map,
        confidenceScore: data.confidence_score,
        confidenceExplanation: data.confidence_explanation,
        executionTimeMs: data.execution_time_ms,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])

      const sources: Source[] = (data.source_map || []).map((s: any, i: number) => ({
        id: String(s.chunk_id || i),
        file: s.file,
        page: s.page,
        snippet: s.snippet,
      }))
      setCurrentSources(sources)
      setCurrentConfidence(
        typeof data.confidence_score === 'number' ? data.confidence_score : null
      )
      setCurrentExplanation(data.confidence_explanation || '')
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: e?.message || 'Something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery()
    }
  }

  const confidenceColor =
    currentConfidence === null
      ? ''
      : currentConfidence >= 0.85
      ? 'confidence-fill-high'
      : currentConfidence >= 0.65
      ? 'confidence-fill-medium'
      : 'confidence-fill-low'

  const confidenceLabel =
    currentConfidence === null
      ? null
      : currentConfidence >= 0.85
      ? 'HIGH'
      : currentConfidence >= 0.65
      ? 'MEDIUM'
      : 'LOW'

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        gap: '16px',
        padding: '16px 24px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Nebula background */}
      <div className="nebula-bg">
        <div className="stars-bg" />
        <div className="nebula-orb nebula-orb-1" style={{ opacity: 0.12 }} />
        <div className="nebula-orb nebula-orb-3" style={{ opacity: 0.08 }} />
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '4px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                textAlign: 'center',
                padding: '40px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  background: 'rgba(124, 58, 237, 0.15)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 32px rgba(124,58,237,0.2)',
                }}
              >
                <Brain size={28} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2
                  className="font-display"
                  style={{ fontSize: '22px', fontWeight: 600, color: 'white', marginBottom: '8px' }}
                >
                  The convergence of neural architecture
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', lineHeight: 1.6 }}>
                  {documents.length === 0
                    ? 'Upload documents in Archives first, then transmit your queries here.'
                    : `${documents.length} document${documents.length > 1 ? 's' : ''} indexed. Transmit your query to the Sovereign AI.`}
                </p>
              </div>

              {documents.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    maxWidth: '500px',
                  }}
                >
                  {documents.slice(0, 4).map((doc) => (
                    <div key={doc.id} className="chip chip-purple">
                      <FileText size={10} />
                      {doc.name?.split('.')[0] || 'Document'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className="animate-fade-in"
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  {msg.role === 'user' ? (
                    <div className="chat-bubble-user">
                      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.92)' }}>
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    <div className="chat-bubble-ai" style={{ maxWidth: '100%' }}>
                      {/* Synthesis stream label */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '14px',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            background: 'rgba(124,58,237,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Zap size={10} style={{ color: '#a78bfa' }} />
                        </div>
                        <span
                          className="font-mono"
                          style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}
                        >
                          SYNTHESIS STREAM
                        </span>
                        {msg.executionTimeMs && (
                          <span
                            className="font-mono"
                            style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', letterSpacing: '0.1em' }}
                          >
                            {Math.round(msg.executionTimeMs)}MS PROCESSING
                          </span>
                        )}
                      </div>

                      {/* Answer */}
                      <div className="nebula-prose">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Confidence */}
                      {msg.confidenceScore != null && (
                        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div
                                style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  minWidth: '120px',
                                }}
                              >
                                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                  NEURAL WEIGHT
                                </div>
                                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                                  {Math.round(msg.confidenceScore * 100)}% Confidence
                                </div>
                              </div>
                              {msg.sourceMap && msg.sourceMap.length > 0 && (
                                <div
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    minWidth: '120px',
                                  }}
                                >
                                  <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                    PRIMARY NODE
                                  </div>
                                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                                    {msg.sourceMap.length} source{msg.sourceMap.length > 1 ? 's' : ''} cited
                                  </div>
                                </div>
                              )}
                            </div>
                            {confidenceLabel && (
                              <span
                                className={`chip ${
                                  confidenceLabel === 'HIGH'
                                    ? 'chip-green'
                                    : confidenceLabel === 'MEDIUM'
                                    ? 'chip-amber'
                                    : 'chip-red'
                                }`}
                              >
                                {confidenceLabel}
                              </span>
                            )}
                          </div>
                          <div className="confidence-bar">
                            <div
                              className={`confidence-fill ${confidenceColor}`}
                              style={{ width: `${Math.round(msg.confidenceScore * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto' }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <span className="font-mono" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>
                      Analyzing documents...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div style={{ flexShrink: 0, zIndex: 2 }}>
          <div className="chat-input-bar">
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(124,58,237,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={14} style={{ color: '#a78bfa' }} />
            </div>

            <textarea
              ref={inputRef}
              id="nexus-query-input"
              className="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Transmit your next query to the Sovereign AI..."
              disabled={loading}
              style={{
                resize: 'none',
                maxHeight: '100px',
                overflow: 'auto',
                lineHeight: '1.5',
              }}
            />

            <button
              id="nexus-send-btn"
              className="chat-send-btn"
              onClick={sendQuery}
              disabled={loading || !input.trim()}
            >
              <Send size={14} />
            </button>
          </div>
          <p
            className="font-mono"
            style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '8px', letterSpacing: '0.1em' }}
          >
            SHIFT + ENTER FOR MULTI-LINE SYNTHESIS
          </p>
        </div>
      </div>

      {/* Evidence Rail */}
      {(currentSources.length > 0 || currentConfidence !== null) && (
        <div className="evidence-rail animate-slide-in-right" style={{ zIndex: 1 }}>
          <div
            className="font-mono"
            style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginBottom: '4px' }}
          >
            EVIDENCE RAIL
          </div>

          {/* Confidence summary */}
          {currentConfidence !== null && (
            <div
              className="glass-card"
              style={{ padding: '14px', marginBottom: '4px' }}
            >
              <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '6px' }}>
                CURRENT CONTEXT
              </div>
              <div
                style={{
                  borderRadius: '8px',
                  background: 'rgba(124,58,237,0.1)',
                  padding: '10px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.5,
                }}
              >
                {currentExplanation ||
                  `You are currently operating within the Quantum Synthesis layer. All queries are being cross-referenced with your indexed documents.`}
              </div>
              <div className="confidence-bar">
                <div
                  className={`confidence-fill ${confidenceColor}`}
                  style={{ width: `${Math.round(currentConfidence * 100)}%` }}
                />
              </div>
              <div
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', textAlign: 'right' }}
              >
                {Math.round(currentConfidence * 100)}% confidence
              </div>
            </div>
          )}

          {/* Sources */}
          {currentSources.map((src) => (
            <div key={src.id} className="evidence-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <FileText size={12} style={{ color: '#a78bfa', flexShrink: 0 }} />
                <span
                  className="font-mono"
                  style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {src.file}
                </span>
              </div>
              {src.page && (
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                  PAGE {src.page}
                </div>
              )}
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {src.snippet}
              </p>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '8px',
                  color: '#a78bfa',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Illuminate <ChevronRight size={12} />
              </button>
            </div>
          ))}

          {/* DB icon for document count */}
          {documents.length > 0 && (
            <div
              className="glass-card"
              style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <Database size={14} style={{ color: '#a78bfa' }} />
              <div>
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                  RELATIONAL DATASET
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                  {documents.length} document{documents.length > 1 ? 's' : ''} indexed
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
