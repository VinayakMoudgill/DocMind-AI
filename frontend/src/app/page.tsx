'use client'

import React, { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { TopNav } from '../components/TopNav'
import { StatusBar } from '../components/StatusBar'
import { NexusPage } from '../components/NexusPage'
import { ArchivesPage } from '../components/ArchivesPage'
import { KnowledgePage } from '../components/KnowledgePage'
import { SignalsPage } from '../components/SignalsPage'
import { ExamLensPage } from '../components/ExamLensPage'

type Page = 'nexus' | 'archives' | 'knowledge' | 'signals' | 'examlens'

// Nav from top bar maps to pages (archives also shows knowledge sub-view)
const topNavMap: Record<string, Page> = {
  nexus: 'nexus',
  archives: 'archives',
  signals: 'signals',
  examlens: 'examlens',
}

export default function Home() {
  const [activePage, setActivePage] = useState<Page>('nexus')
  const [documents, setDocuments] = useState<any[]>([])
  const [conversationId] = useState(() => crypto.randomUUID())

  const handleDocumentsUploaded = (newDocs: any[]) => {
    setDocuments((prev) => {
      const existing = new Set(prev.map((d) => d.id))
      const fresh = newDocs.filter((d) => !existing.has(d.id))
      return [...prev, ...fresh]
    })
  }

  const navigate = (page: string) => {
    setActivePage((page as Page) || 'nexus')
  }

  // Archive nav also shows knowledge sub-panel after upload — keep simple
  const goToArchives = () => setActivePage('archives')

  return (
    <div className="app-shell">
      {/* Left sidebar */}
      <Sidebar activePage={activePage} onNavigate={navigate} />

      {/* Main area */}
      <div className="app-main">
        {/* Top nav */}
        <TopNav activePage={activePage} onNavigate={navigate} />

        {/* Page content */}
        <div className="app-content">
          {activePage === 'nexus' && (
            <NexusPage documents={documents} conversationId={conversationId} />
          )}
          {activePage === 'archives' && (
            <ArchivesPage
              onDocumentsUploaded={(docs) => {
                handleDocumentsUploaded(docs)
              }}
              documents={documents}
            />
          )}
          {activePage === 'knowledge' && (
            <KnowledgePage
              documents={documents}
              onDocumentsUploaded={handleDocumentsUploaded}
              onUploadClick={goToArchives}
            />
          )}
          {activePage === 'signals' && <SignalsPage documents={documents} />}
          {activePage === 'examlens' && <ExamLensPage documents={documents} />}
        </div>

        {/* Status bar */}
        <StatusBar />
      </div>
    </div>
  )
}
