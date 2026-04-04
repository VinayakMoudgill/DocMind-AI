'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  BarChart2,
  Clock,
  Map,
  Shield,
  ArrowLeftRight,
  Loader,
  ListFilter,
} from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface SignalsPageProps {
  documents: any[]
}

interface Conflict {
  entity_name: string
  entity_type: string
  confidence: number
  occurrences: { document_id: string; filename: string; page?: number; value: string }[]
}

export function SignalsPage({ documents }: SignalsPageProps) {
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [execMs, setExecMs] = useState<number | null>(null)
  const [docsAnalyzed, setDocsAnalyzed] = useState<number | null>(null)
  const [activeConflictIdx, setActiveConflictIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ran, setRan] = useState(false)

  const analyze = async () => {
    setLoading(true)
    setError(null)
    setConflicts([])
    setRan(true)
    try {
      const res = await fetch(`${API_BASE}/disagreement-detector/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: documents.map((d) => d.id).filter(Boolean),
          min_conflicts: 1,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')

      setConflicts(data.conflicts || [])
      setExecMs(data.execution_time_ms ?? null)
      setDocsAnalyzed(data.documents_analyzed ?? null)
      setActiveConflictIdx(0)
    } catch (e: any) {
      setError(e?.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const active = conflicts[activeConflictIdx] ?? null

  const occA = active?.occurrences?.[0]
  const occB = active?.occurrences?.[1]

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
      {/* Bg */}
      <div className="nebula-bg">
        <div className="stars-bg" />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Header */}
      <div style={{ zIndex: 1, marginBottom: '20px' }}>
        {ran && conflicts.length > 0 && (
          <div className="conflict-header" style={{ display: 'inline-flex', marginBottom: '12px' }}>
            <AlertTriangle size={14} style={{ color: '#fb923c' }} />
            <span
              className="font-mono"
              style={{ fontSize: '11px', color: '#fb923c', letterSpacing: '0.12em', fontWeight: 600 }}
            >
              CONFLICT DETECTED · ARCHIVE-{String(activeConflictIdx + 1).padStart(2, '0')}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1
              className="font-display"
              style={{ fontSize: '36px', fontWeight: 700, color: 'white', marginBottom: '8px', lineHeight: 1.15 }}
            >
              Signal Alignment
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', maxWidth: '500px', lineHeight: 1.5 }}>
              {ran && active
                ? 'Two disparate data strands have entered the focal zone. Align the primary source to maintain archive integrity.'
                : 'Scan your indexed documents for conflicting entity values, dates, and factual inconsistencies.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            {ran && conflicts.length > 0 && (
              <button className="btn-nebula btn-nebula-secondary" id="signals-discard">
                Discard Cluster
              </button>
            )}
            <button
              className="btn-nebula btn-nebula-primary"
              onClick={analyze}
              disabled={loading || documents.length === 0}
              id="signals-analyze-btn"
              style={{ opacity: documents.length === 0 ? 0.5 : 1 }}
            >
              {loading ? (
                <>
                  <Loader size={14} style={{ animation: 'spin-slow 1s linear infinite' }} />
                  Scanning...
                </>
              ) : (
                <>
                  <ListFilter size={14} />
                  {ran ? 'Re-Scan' : 'Export Logs'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="glass-card-amber animate-fade-in"
          style={{ padding: '14px 18px', marginBottom: '16px', zIndex: 1 }}
        >
          <p style={{ fontSize: '13px', color: '#fb923c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} /> {error}
          </p>
        </div>
      )}

      {/* Idle state */}
      {!ran && !loading && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '22px',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(249,115,22,0.1)',
            }}
          >
            <ArrowLeftRight size={32} style={{ color: '#fb923c' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 500 }}>
              {documents.length === 0
                ? 'Upload documents in Archives first'
                : `${documents.length} document${documents.length > 1 ? 's' : ''} ready for signal analysis`}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Detects conflicting dates, numbers, names, and facts across documents
            </p>
          </div>
          {documents.length > 0 && (
            <button
              className="btn-nebula btn-nebula-amber"
              onClick={analyze}
              id="signals-run-btn"
            >
              <Shield size={14} /> Run Conflict Analysis
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 1,
          }}
        >
          <Loader size={40} style={{ color: '#a78bfa', animation: 'spin-slow 2s linear infinite' }} />
          <p className="font-mono" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
            SCANNING FOR SIGNAL DIVERGENCE...
          </p>
        </div>
      )}

      {/* No conflicts */}
      {ran && !loading && conflicts.length === 0 && !error && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={28} style={{ color: '#4ade80' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', fontWeight: 500 }}>
            No conflicts detected
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            {docsAnalyzed} document{docsAnalyzed !== 1 ? 's' : ''} analyzed · all signals aligned
          </p>
        </div>
      )}

      {/* Conflicts found */}
      {ran && !loading && conflicts.length > 0 && active && (
        <div style={{ flex: 1, overflow: 'hidden', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Source labels */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '11px' }}>
            <span className="chip chip-purple">SOURCE A · LOCAL NODE</span>
            <span style={{ flex: 1 }} />
            <span className="chip chip-amber">SOURCE B · REMOTE CLUSTER</span>
          </div>

          {/* Diff panels */}
          <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden' }}>
            {/* Panel A */}
            <div className="diff-panel" style={{ overflow: 'auto' }}>
              {occA ? (
                <>
                  <div className="font-mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', letterSpacing: '0.1em' }}>
                    HASH · CONFIG · 00
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '16px' }}>
                    Entity <span className="diff-highlight">{active.entity_name}</span> found with value{' '}
                    <span className="diff-highlight">"{occA.value}"</span>{' '}
                    in {occA.filename}{occA.page ? `, page ${occA.page}` : ''}.
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>
                    Confidence score: {Math.round(active.confidence * 100)}% · entity type: {active.entity_type}
                  </p>
                  <button className="btn-nebula btn-nebula-secondary" id="signals-adopt-a" style={{ fontSize: '12px', padding: '8px 20px', letterSpacing: '0.08em' }}>
                    ADOPT SOURCE A
                  </button>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No occurrence data</p>
              )}
            </div>

            {/* Center buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flexShrink: 0 }}>
              <button className="btn-icon" style={{ width: '44px', height: '44px', borderRadius: '12px', border: 'none' }}>
                <ArrowLeftRight size={16} />
              </button>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(249,115,22,0.5)',
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: '8px',
                  fontWeight: 700,
                  color: 'white',
                  letterSpacing: '0.08em',
                  lineHeight: 1.2,
                }}
              >
                RESOLVE<br />SIGNAL
              </div>
              <button className="btn-icon" style={{ width: '44px', height: '44px', borderRadius: '12px', border: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </button>
            </div>

            {/* Panel B */}
            <div className="diff-panel" style={{ overflow: 'auto' }}>
              {occB ? (
                <>
                  <div className="font-mono" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', letterSpacing: '0.1em' }}>
                    HASH · SIGMA · 01
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '16px' }}>
                    Entity <span className="diff-highlight-alt">{active.entity_name}</span> found with conflicting value{' '}
                    <span className="diff-highlight-alt">"{occB.value}"</span>{' '}
                    in {occB.filename}{occB.page ? `, page ${occB.page}` : ''}.
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '24px' }}>
                    Divergence detected · {active.occurrences.length} unique occurrences found across indexed documents.
                  </p>
                  <button className="btn-nebula btn-nebula-secondary" id="signals-adopt-b" style={{ fontSize: '12px', padding: '8px 20px', letterSpacing: '0.08em' }}>
                    ADOPT SOURCE B
                  </button>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Only one source for this entity</p>
              )}
            </div>
          </div>

          {/* Metrics row */}
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <div className="metric-card">
              <BarChart2 size={18} style={{ color: '#a78bfa' }} />
              <div>
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '3px' }}>
                  CONFIDENCE
                </div>
                <div className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  {Math.round(active.confidence * 100)}%
                </div>
              </div>
            </div>
            <div className="metric-card">
              <Clock size={18} style={{ color: '#a78bfa' }} />
              <div>
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '3px' }}>
                  LATENCY
                </div>
                <div className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  {execMs ? `${Math.round(execMs)}ms` : '—'}
                </div>
              </div>
            </div>
            <div className="metric-card">
              <Map size={18} style={{ color: '#a78bfa' }} />
              <div>
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '3px' }}>
                  SPATIAL
                </div>
                <div className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  Grid-{docsAnalyzed}
                </div>
              </div>
            </div>
            <div className="metric-card">
              <Shield size={18} style={{ color: '#a78bfa' }} />
              <div>
                <div className="font-mono" style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginBottom: '3px' }}>
                  CONFLICTS
                </div>
                <div className="font-display" style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                  {conflicts.length}
                </div>
              </div>
            </div>
          </div>

          {/* Conflict navigation */}
          {conflicts.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexShrink: 0 }}>
              {conflicts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveConflictIdx(i)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: i === activeConflictIdx ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${i === activeConflictIdx ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: i === activeConflictIdx ? '#fb923c' : 'rgba(255,255,255,0.3)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
