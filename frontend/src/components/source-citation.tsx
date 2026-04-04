'use client'

import React, { useState } from 'react'
import { FileText, Copy, Check } from 'lucide-react'

interface Source {
  id: string
  file: string
  page?: number | null
  snippet: string
}

interface SourceCitationProps {
  sources: Source[]
  confidence: number | null
  explanation: string
}

export function SourceCitation({
  sources,
  confidence,
  explanation,
}: SourceCitationProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="card p-6 lg:sticky lg:top-6 dark:bg-neutral-800">
      <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
        Source Grounding
      </h2>

      <div className="space-y-3">
        {!sources?.length ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Ask a question to see sources
          </p>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50"
            >
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                    {source.file}
                    {source.page != null ? ` • Page ${source.page}` : ''}
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-2">
                    &ldquo;{source.snippet}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(source.id, source.snippet)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    {copied === source.id ? (
                      <>
                        <Check size={12} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        {/* Confidence removed */}
      </div>
    </div>
  )
}
