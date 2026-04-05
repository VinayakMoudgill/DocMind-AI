'use client'

import React from 'react'
import { Loader, User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  confidenceScore?: number
  quality?: 'optimal' | 'good' | 'needs_improvement'
  documentContext?: 'active' | 'none'
}

interface MessageDisplayProps {
  messages: Message[]
  isProcessing: boolean
}

export function MessageDisplay({ messages, isProcessing }: MessageDisplayProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot size={20} className="text-blue-400" />
            Neural Conversation
          </h3>
          <div className="text-xs text-neutral-500">
            {messages.length} messages
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 neural-glow">
              <Bot size={32} className="text-white" />
            </div>
            <p className="text-neutral-400 text-sm mb-2">Start a conversation...</p>
            <p className="text-neutral-500 text-xs">Type your query above to begin chatting with your documents</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-enter flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600'
                : 'bg-gradient-to-r from-green-600 to-teal-600'
                }`}>
                {message.role === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <Bot size={16} className="text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col max-w-[70%] ${message.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                <div
                  className={`p-3 rounded-2xl ${message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-black/50 border border-neutral-800/50 text-neutral-100'
                    }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
                      code: ({ children }) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs">{children}</code>,
                      pre: ({ children }) => <pre className="bg-black/30 p-2 rounded text-xs overflow-x-auto">{children}</pre>
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>

                  {message.confidenceScore && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs opacity-70">
                        <span>Confidence</span>
                        <span className={`font-medium ${message.confidenceScore > 0.8 ? 'text-green-400' :
                          message.confidenceScore > 0.6 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                          {Math.round(message.confidenceScore * 100)}%
                        </span>
                      </div>
                      {/* Quality Indicators */}
                      {message.quality && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${message.quality === 'optimal' ? 'bg-green-500/20 text-green-400' :
                              message.quality === 'good' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                            {message.quality === 'optimal' ? '🎯 Optimal' :
                              message.quality === 'good' ? '✅ Good' : '⚠️ Needs Improvement'}
                          </span>
                          {message.documentContext && (
                            <span className={`text-xs px-2 py-1 rounded ${message.documentContext === 'active' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                              {message.documentContext === 'active' ? '📄 Context Active' : '📄 No Context'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`text-xs text-neutral-500 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-600 to-teal-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex flex-col max-w-[70%]">
              <div className="bg-black/50 border border-neutral-800/50 p-3 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Loader size={16} className="animate-spin text-blue-400" />
                  <span className="text-sm text-neutral-400">Processing your query...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
