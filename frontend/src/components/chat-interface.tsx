'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Zap, AlertCircle, CheckCircle, Loader } from 'lucide-react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceMap?: any[]
  confidenceScore?: number
  timestamp: Date
}

interface ChatInterfaceProps {
  conversationId: string
  documents: any[]
  onSourcesUpdate?: (sources: any[], confidence: number, explanation: string) => void
}

export function ChatInterface({
  conversationId,
  documents,
  onSourcesUpdate,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendQuery = async (q: string, options?: { skipNli?: boolean }) => {
    const trimmed = q.trim()
    if (!trimmed) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
          document_ids: documents.map((d) => d.id).filter(Boolean),
          use_nli_validation: options?.skipNli !== true,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Request failed')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || '',
        sourceMap: data.source_map,
        confidenceScore: data.confidence_score,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      const sources = (data.source_map || []).map((s: any, i: number) => ({
        id: String(s.chunk_id || i),
        file: s.file,
        page: s.page,
        snippet: s.snippet,
      }))

      onSourcesUpdate?.(
        sources,
        typeof data.confidence_score === 'number' ? data.confidence_score : 0,
        (data.confidence_explanation as string) || '',
      )
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: e?.message || 'Something went wrong.',
          timestamp: new Date(),
        },
      ])
      onSourcesUpdate?.([], 0, '')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const q = input
    setInput('')
    await sendQuery(q)
  }

  return (
    <div className="card flex flex-col h-[600px] dark:bg-neutral-800">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-neutral-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Zap size={32} className="text-blue-600 dark:text-blue-400 mb-3" />
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Start a conversation
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
              Upload documents and ask questions. Every answer is grounded in your data.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-3 rounded-lg ${message.role === 'user'
                      ? 'max-w-md bg-blue-600 dark:bg-blue-700 text-white rounded-br-none'
                      : 'max-w-2xl w-full bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-bl-none'
                    }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-neutral-800 prose-pre:text-neutral-100 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}

                  {message.role === 'assistant' && message.confidenceScore != null && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600 flex items-center gap-2">
                      {message.confidenceScore >= 0.85 ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : message.confidenceScore >= 0.7 ? (
                        <AlertCircle size={14} className="text-amber-500" />
                      ) : (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {Math.round(message.confidenceScore * 100)}% Confident
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-2 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-700">
                  <Loader size={16} className="animate-spin text-neutral-600 dark:text-neutral-400" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Analyzing documents...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-800">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question about your documents..."
            disabled={loading || documents.length === 0}
            className="flex-1 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={loading || !input.trim() || documents.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
