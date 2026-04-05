'use client'

import React, { useState } from 'react'
import { Sidebar } from './sidebar'
import { TopNavigation } from './top-navigation'
import { StatusBar } from './status-bar'
import { NeuralHub } from './neural-hub'
import { IngestionTerminal } from './ingestion-terminal'
import { MessageDisplay } from './message-display'
import { SignalAnalysis } from './signal-analysis'
import { ExamLens } from './exam-lens'

export function DashboardNew() {
  const [activeTab, setActiveTab] = useState('nexus')
  const [documents, setDocuments] = useState<any[]>([])
  const [conversationId] = useState(() => crypto.randomUUID())
  const [messages, setMessages] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Debug: Log documents state changes
  React.useEffect(() => {
    console.log('Dashboard - Documents state updated:', documents)
  }, [documents])

  // Debug: Log tab changes
  React.useEffect(() => {
    console.log('Dashboard - Active tab changed to:', activeTab)
  }, [activeTab])

  // Sync sidebar and top navigation
  const handleTabChange = (tab: string) => {
    console.log('Dashboard - Tab change requested:', tab)
    setActiveTab(tab)
  }

  const handleQuery = async (query: string) => {
    if (!query.trim()) return

    setIsProcessing(true)

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

      // Only send document IDs if we have documents
      const documentIds = documents.length > 0 ? documents.map((d) => d.id).filter(Boolean) : []

      // Debug: Log what we're sending to backend
      console.log('NEXUS - Sending query:', query)
      console.log('NEXUS - Available documents:', documents)
      console.log('NEXUS - Document IDs being sent:', documentIds)

      const response = await fetch(`${API_BASE}/chat/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversation_id: conversationId,
          document_ids: documentIds,
          use_nli_validation: true,
          priority: 'high',
          max_tokens: 2000,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      console.log('NEXUS - API Request body:', {
        message: query,
        conversation_id: conversationId,
        document_ids: documentIds,
        use_nli_validation: true,
        priority: 'high',
        max_tokens: 2000,
        temperature: 0.1
      })

      console.log('NEXUS - API Request body:', {
        message: query,
        conversation_id: conversationId,
        document_ids: documentIds,
        use_nli_validation: true,
        priority: 'high',
        max_tokens: 2000,
        temperature: 0.1
      })

      const responseData = await response.json().catch(() => ({}))
      console.log('NEXUS - API Response:', responseData)
      console.log('NEXUS - Response status:', response.status)

      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || 'Request failed')
      }

      // Add assistant response to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData.answer || 'I apologize, but I couldn\'t process your request.',
        timestamp: new Date(),
        confidenceScore: responseData.confidence_score,
        // Add quality indicators
        quality: responseData.confidence_score > 0.8 ? 'optimal' : responseData.confidence_score > 0.6 ? 'good' : 'needs_improvement',
        documentContext: documentIds.length > 0 ? 'active' : 'none'
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error: any) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error?.message || 'Something went wrong. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }


  const renderMainContent = () => {
    switch (activeTab) {
      case 'nexus':
        return <NeuralHub onQuery={handleQuery} availableDocuments={documents} />
      case 'archives':
        return (
          <div className="h-full px-8">
            <IngestionTerminal onUpload={(docs) => setDocuments((prev) => [...prev, ...docs])} documents={documents} />
          </div>
        )
      case 'signals':
        return <SignalAnalysis />
      case 'exam-lens':
        return <ExamLens documents={documents} />
      default:
        return <NeuralHub onQuery={handleQuery} />
    }
  }

  return (
    <div className="min-h-screen neural-bg flex flex-col">
      {/* Top Navigation */}
      <TopNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeItem={activeTab} onItemClick={handleTabChange} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {renderMainContent()}
          </div>

          {/* Chat Interface (shown when in nexus) */}
          {activeTab === 'nexus' && (
            <div className="h-96 border-t border-neutral-900/50">
              <MessageDisplay messages={messages} isProcessing={isProcessing} />
            </div>
          )}
        </div>

        {/* Source Panel - Removed */}
        {/* Source panel functionality has been disabled */}
      </div>

      {/* Status Bar */}
      <StatusBar
        backendStatus="offline"
        latency={0}
        nliShield={true}
        hybridSearch={true}
      />
    </div>
  )
}
