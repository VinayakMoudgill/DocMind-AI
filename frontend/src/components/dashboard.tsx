'use client'

import React, { useState } from 'react'
import { FileText, Settings } from 'lucide-react'
import { DocumentUploader } from './document-uploader'
import { ChatInterface } from './chat-interface'
import { SourceCitation } from './source-citation'

export function Dashboard() {
  const [documents, setDocuments] = useState<any[]>([])
  const [conversationId] = useState(() => crypto.randomUUID())
  const [showSourcePanel] = useState(true)
  const [lastSources, setLastSources] = useState<any[]>([])
  const [lastConfidence, setLastConfidence] = useState<number | null>(null)
  const [lastExplanation, setLastExplanation] = useState<string>('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">DocMind AI</h1>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
              <Settings size={20} className="text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Documents & Upload */}
          <div className="lg:col-span-3">
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
                Documents
              </h2>

              <DocumentUploader
                onUpload={(newDocs) => setDocuments((prev) => [...prev, ...newDocs])}
              />

              <div className="mt-6 space-y-3">
                {documents.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No documents uploaded yet
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id || doc.name}
                      className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 flex items-start gap-3"
                    >
                      <FileText size={16} className="text-blue-600 dark:text-blue-400 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {doc.chunks} chunks
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Panel - Chat Interface */}
          <div className={showSourcePanel ? 'lg:col-span-6' : 'lg:col-span-9'}>
            <ChatInterface
              conversationId={conversationId}
              documents={documents}
              onSourcesUpdate={(sources, confidence, explanation) => {
                setLastSources(sources)
                setLastConfidence(confidence)
                setLastExplanation(explanation)
              }}
            />
          </div>

          {/* Right Panel - Source Citation */}
          {showSourcePanel && (
            <div className="lg:col-span-3">
              <SourceCitation
                sources={lastSources}
                confidence={lastConfidence}
                explanation={lastExplanation}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
