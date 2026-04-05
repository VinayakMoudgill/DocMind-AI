'use client'

import React, { useState, useEffect } from 'react'

interface StatusBarProps {
  backendStatus?: 'online' | 'offline'
  latency?: number
  nliShield?: boolean
  hybridSearch?: boolean
}

export function StatusBar({
  backendStatus: initialBackendStatus = 'offline',
  latency = 0,
  nliShield = true,
  hybridSearch = true
}: StatusBarProps) {
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>(initialBackendStatus)
  const [currentLatency, setCurrentLatency] = useState(latency)

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const startTime = Date.now()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'}/../health`)
        const endTime = Date.now()

        if (response.ok) {
          setBackendStatus('online')
          setCurrentLatency(endTime - startTime)
        } else {
          setBackendStatus('offline')
          setCurrentLatency(0)
        }
      } catch (error) {
        setBackendStatus('offline')
        setCurrentLatency(0)
      }
    }

    // Check immediately
    checkBackendStatus()

    // Check every 5 seconds
    const interval = setInterval(checkBackendStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-8 bg-black/60 backdrop-blur-xl border-t border-neutral-900/50 flex items-center justify-between px-8">
      <div className="flex items-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className={`status-dot ${backendStatus === 'online' ? 'status-online' : 'status-offline'}`} />
          <span className="text-neutral-400">BACKEND {backendStatus.toUpperCase()}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="status-dot status-warning" />
          <span className="text-neutral-400">{currentLatency}MS LATENCY</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`status-dot ${nliShield ? 'status-online' : 'status-offline'}`} />
          <span className="text-neutral-400">NLI SHIELD {nliShield ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`status-dot ${hybridSearch ? 'status-online' : 'status-offline'}`} />
          <span className="text-neutral-400">HYBRID SEARCH {hybridSearch ? 'READY' : 'NOT READY'}</span>
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        DOCMIND AI v1.0.0
      </div>
    </div>
  )
}
