'use client'

import React from 'react'
import { Brain, Send } from 'lucide-react'

interface NeuralHubProps {
  onQuery?: (query: string) => void
  availableDocuments?: any[]
}

export function NeuralHub({ onQuery, availableDocuments = [] }: NeuralHubProps) {
  const [query, setQuery] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)

  // Debug: Log available documents
  React.useEffect(() => {
    console.log('NeuralHub - Available documents updated:', availableDocuments)
    console.log('NeuralHub - Documents length:', availableDocuments.length)
    console.log('NeuralHub - First document name:', availableDocuments[0]?.name)
  }, [availableDocuments])

  // Force refresh when component mounts
  React.useEffect(() => {
    console.log('NeuralHub - Component mounted/updated')

    // Add custom animation styles
    const style = document.createElement('style')
    style.textContent = `
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      .animate-spin-slow {
        animation: spin-slow 20s linear infinite;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && onQuery) {
      setIsSending(true)
      onQuery(query)
      // Clear query after a short delay to show it was sent
      setTimeout(() => {
        setQuery('')
        setIsSending(false)
      }, 500)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Submit on Enter (without Shift)
      e.preventDefault()
      handleSubmit(e as any)
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      // Handle multi-line synthesis
      const textarea = e.target as HTMLTextAreaElement
      const value = textarea.value
      const selectionStart = textarea.selectionStart
      const newValue = value.slice(0, selectionStart) + '\n' + value.slice(selectionStart)
      setQuery(newValue)

      // Set cursor position after the new line
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1
      }, 0)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-8">
      {/* Neural Network Icon */}
      <div className="mb-8 relative">
        <div className="w-32 h-32 relative">
          {/* Central node */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center neural-glow">
              <Brain size={32} className="text-white" />
            </div>
          </div>

          {/* Orbiting nodes */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full" />
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-pink-500 rounded-full" />
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-cyan-500 rounded-full" />
          </div>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            <line x1="50%" y1="50%" x2="50%" y2="0%" stroke="rgba(120, 119, 198, 0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="50%" y2="100%" stroke="rgba(120, 119, 198, 0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="0%" y2="50%" stroke="rgba(120, 119, 198, 0.3)" strokeWidth="1" />
            <line x1="50%" y1="50%" x2="100%" y2="50%" stroke="rgba(120, 119, 198, 0.3)" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Available Documents Context */}
      {availableDocuments.length > 0 ? (
        <div className="mb-6 p-4 bg-black/30 border border-neutral-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-white">Context Available</span>
          </div>
          <div className="text-xs text-neutral-400">
            {availableDocuments.length} document{availableDocuments.length !== 1 ? 's' : ''} loaded for analysis
          </div>
          <div className="mt-2 max-h-20 overflow-y-auto">
            {availableDocuments.slice(0, 3).map((doc: any) => (
              <div key={doc.id} className="text-xs text-neutral-300 truncate">
                • {doc.name}
              </div>
            ))}
            {availableDocuments.length > 3 && (
              <div className="text-xs text-neutral-500">
                ...and {availableDocuments.length - 3} more
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-amber-400" />
            <span className="text-sm font-medium text-white">No Documents Available</span>
          </div>
          <div className="text-xs text-neutral-400">
            Upload documents in Archives first, then return to NEXUS for analysis.
          </div>
        </div>
      )}

      {/* Title */}
      <h2 className="text-3xl font-bold gradient-text mb-4 text-center">
        The convergence of neural architecture
      </h2>

      {/* Subtitle */}
      <p className="text-neutral-400 text-center mb-12 max-w-2xl">
        Upload documents in Archives first, then transmit your queries here.
      </p>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-3xl">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Transmit your neural query..."
            className="neural-input w-full pl-4 pr-16 min-h-[60px] max-h-[200px] resize-none"
            rows={1}
          />

          <button
            type="submit"
            disabled={isSending || !query.trim()}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg transition-all duration-300 ${isSending ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-purple-700'
              }`}
          >
            <Send size={16} className={`text-white ${isSending ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="mt-2 text-xs text-neutral-500 text-center">
          SHIFT + ENTER FOR MULTI-LINE SYNTHESIS
        </div>
      </form>
    </div>
  )
}
