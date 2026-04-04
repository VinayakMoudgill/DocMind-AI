'use client'

import React from 'react'
import { User } from 'lucide-react'

interface TopNavProps {
  activePage: string
  onNavigate: (page: string) => void
}

const navLinks = [
  { id: 'nexus', label: 'NEXUS' },
  { id: 'archives', label: 'ARCHIVES' },
  { id: 'signals', label: 'SIGNALS' },
  { id: 'examlens', label: 'EXAM LENS' },
]

export function TopNav({ activePage, onNavigate }: TopNavProps) {
  return (
    <div className="app-topnav">
      <div className="topnav-pill">
        <span className="topnav-brand">DocMind AI</span>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {navLinks.map(({ id, label }) => (
          <button
            key={id}
            className={`topnav-link ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            id={`topnav-${id}`}
          >
            {label}
          </button>
        ))}

        <button className="topnav-user" id="topnav-user" title="User">
          <User size={16} />
        </button>
      </div>
    </div>
  )
}
