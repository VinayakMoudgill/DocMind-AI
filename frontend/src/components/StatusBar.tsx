'use client'

import React, { useEffect, useState } from 'react'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

export function StatusBar() {
  const [latency, setLatency] = useState<number | null>(null)
  const [healthy, setHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      try {
        const res = await fetch(API_BASE.replace('/api', '') + '/health', {
          signal: AbortSignal.timeout(3000),
        })
        const ms = Math.round(performance.now() - t0)
        setLatency(ms)
        setHealthy(res.ok)
      } catch {
        setLatency(null)
        setHealthy(false)
      }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app-statusbar">
      <div className="status-item">
        <span
          className={`status-dot ${
            healthy === null
              ? 'status-dot-amber'
              : healthy
              ? 'status-dot-green'
              : 'status-dot-red'
          }`}
        />
        {healthy === null ? 'CONNECTING' : healthy ? 'SYSTEM STABLE' : 'BACKEND OFFLINE'}
      </div>

      <div className="status-item">
        <span className="status-dot status-dot-green" />
        {latency !== null ? `${latency}MS LATENCY` : '—MS LATENCY'}
      </div>

      <div className="status-item">
        <span className="status-dot status-dot-amber" />
        NLI SHIELD ACTIVE
      </div>

      <div className="status-item">
        <span className="status-dot status-dot-green" />
        HYBRID SEARCH READY
      </div>
    </div>
  )
}
