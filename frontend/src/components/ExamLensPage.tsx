'use client'

import React, { useState } from 'react'
import { GraduationCap, ChevronRight, ChevronLeft, Loader, Zap, AlertCircle } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

const LETTERS = ['A', 'B', 'C', 'D']

interface ExamQuestion {
  stem: string
  options: string[]
  correct_index: number
  source_chunk: string
  difficulty: string
}

interface ExamLensPageProps {
  documents: any[]
}

export function ExamLensPage({ documents }: ExamLensPageProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [execMs, setExecMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    const docId = selectedDocId || documents[0]?.id
    if (!docId) return
    setLoading(true)
    setError(null)
    setQuestions([])
    setCurrentIdx(0)
    setSelectedOption(null)
    setRevealed(false)

    try {
      const res = await fetch(`${API_BASE}/exam-lens/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, num_questions: numQuestions, difficulty }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || 'Generation failed')
      setQuestions(data.questions || [])
      setExecMs(data.execution_time_ms ?? null)
    } catch (e: any) {
      setError(e?.message || 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  const current = questions[currentIdx]

  const selectOption = (idx: number) => {
    if (revealed) return
    setSelectedOption(idx)
    setRevealed(true)
  }

  const next = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
      setSelectedOption(null)
      setRevealed(false)
    }
  }

  const prev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1)
      setSelectedOption(null)
      setRevealed(false)
    }
  }

  const difficultyColor = {
    easy: 'chip-green',
    medium: 'chip-purple',
    hard: 'chip-amber',
  }[difficulty]

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        overflow: 'hidden',
        position: 'relative',
        maxWidth: '860px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Bg */}
      <div className="nebula-bg">
        <div className="stars-bg" />
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* Config bar */}
      <div
        className="glass-card"
        style={{ padding: '14px 20px', marginBottom: '20px', zIndex: 1, display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}
      >
        {/* Doc selector */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label className="input-label">Document</label>
          <select
            id="examlens-doc-select"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: documents.length ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
            disabled={documents.length === 0}
          >
            {documents.length === 0 ? (
              <option value="">Upload documents first</option>
            ) : (
              documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name?.split('.')[0] || d.id}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Num questions */}
        <div>
          <label className="input-label">Questions</label>
          <select
            id="examlens-num-select"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            {[3, 5, 8, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="input-label">Difficulty</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: difficulty === d ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${difficulty === d ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: difficulty === d ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn-nebula btn-nebula-primary"
          onClick={generate}
          disabled={loading || documents.length === 0}
          id="examlens-generate-btn"
          style={{ marginTop: '16px', opacity: documents.length === 0 ? 0.5 : 1 }}
        >
          {loading ? (
            <><Loader size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> Generating...</>
          ) : (
            <><Zap size={14} /> Generate Questions</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="glass-card-amber animate-fade-in"
          style={{ padding: '12px 16px', marginBottom: '16px', zIndex: 1 }}
        >
          <p style={{ fontSize: '13px', color: '#fb923c', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} /> {error}
          </p>
        </div>
      )}

      {/* Idle state */}
      {!loading && questions.length === 0 && !error && (
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
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(124,58,237,0.1)',
            }}
          >
            <GraduationCap size={30} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.65)', marginBottom: '8px', fontWeight: 500 }}>
              Exam Lens
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', maxWidth: '380px', lineHeight: 1.6 }}>
              {documents.length === 0
                ? 'Upload documents in Archives to generate practice exam questions'
                : 'Select a document, choose settings, and generate AI-powered MCQ questions'}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
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
            SYNTHESIZING EXAM QUESTIONS...
          </p>
        </div>
      )}

      {/* Question card */}
      {!loading && current && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1, overflow: 'auto' }}>
          {/* Question card */}
          <div className="glass-card animate-fade-in" style={{ padding: '28px 32px' }}>
            {/* Labels */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`chip ${difficultyColor}`}>
                  {difficulty.toUpperCase()}
                </span>
                <span className="chip chip-purple">
                  PHASE {String(currentIdx + 1).padStart(2, '0')} · QUANTUM ENTANGLEMENT
                </span>
              </div>
              <div className="btn-icon" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'default' }}>
                <GraduationCap size={14} style={{ color: '#a78bfa' }} />
              </div>
            </div>

            {/* Question stem */}
            <h2
              className="font-display"
              style={{ fontSize: '22px', fontWeight: 700, color: 'white', lineHeight: 1.35, marginBottom: '12px' }}
            >
              {current.stem}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px', lineHeight: 1.5 }}>
              Select the response frequency that matches the core logic of the archive engine.
            </p>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {current.options.map((opt, i) => {
                let optClass = ''
                if (revealed) {
                  if (i === current.correct_index) optClass = 'correct'
                  else if (i === selectedOption) optClass = 'incorrect'
                } else if (i === selectedOption) {
                  optClass = 'selected'
                }
                return (
                  <button
                    key={i}
                    className={`mcq-option ${optClass}`}
                    onClick={() => selectOption(i)}
                    id={`examlens-option-${LETTERS[i]}`}
                  >
                    <span className="mcq-letter">{LETTERS[i]}</span>
                    <span style={{ fontSize: '13px', textAlign: 'left', lineHeight: 1.4 }}>{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation + progress */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingBottom: '8px' }}>
            {/* Progress dots */}
            <div className="progress-dots">
              {questions.map((_, i) => (
                <button
                  key={i}
                  className={`progress-dot ${i < currentIdx ? 'completed' : i === currentIdx ? 'current' : ''}`}
                  onClick={() => { setCurrentIdx(i); setSelectedOption(null); setRevealed(false) }}
                  style={{ border: 'none', cursor: 'pointer', padding: 0 }}
                />
              ))}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em' }}
            >
              ARCHIVE DEPTH: {String(currentIdx + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
              {execMs && ` · ${Math.round(execMs)}MS PROCESSING`}
            </div>

            {/* Nav arrows */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-nebula btn-nebula-secondary"
                onClick={prev}
                disabled={currentIdx === 0}
                style={{ padding: '8px 16px', opacity: currentIdx === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                className="btn-nebula btn-nebula-primary"
                onClick={next}
                disabled={currentIdx === questions.length - 1}
                style={{ padding: '8px 16px', opacity: currentIdx === questions.length - 1 ? 0.4 : 1 }}
                id="examlens-next-btn"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
