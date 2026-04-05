'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Send, Loader } from 'lucide-react'

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

export function ChatInterfaceNew({
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!input.trim() || loading) return
      const q = input
      setInput('')
      sendQuery(q)
    }
  }

  return (
    <div className="glass-card h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-neutral-400 text-sm">Start a conversation...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-enter ${message.role === 'user' ? 'text-right' : 'text-left'
                }`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-xl ${message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-black/50 border border-neutral-800/50 text-neutral-100'
                  }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-sm">{children}</p>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.confidenceScore && (
                  <div className="mt-2 text-xs opacity-70">
                    Confidence: {Math.round(message.confidenceScore * 100)}%
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="text-left">
            <div className="inline-block bg-black/50 border border-neutral-800/50 p-3 rounded-xl">
              <div className="flex items-center space-x-2">
                <Loader size={16} className="animate-spin text-blue-400" />
                <span className="text-sm text-neutral-400">Processing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neutral-900/50 p-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="neural-input w-full pr-12"
            />
            <button
              onClick={() => {
                if (!input.trim() || loading) return
                const q = input
                setInput('')
                sendQuery(q)
              }}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
