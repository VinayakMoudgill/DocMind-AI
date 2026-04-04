'use client'

import React from 'react'
import {
  Box,
  BookOpen,
  AlertTriangle,
  Library,
  Settings,
  GraduationCap,
  User,
} from 'lucide-react'

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'nexus', icon: Box, label: 'Nexus' },
  { id: 'archives', icon: BookOpen, label: 'Archives / Upload' },
  { id: 'knowledge', icon: Library, label: 'Knowledge Archive' },
  { id: 'signals', icon: AlertTriangle, label: 'Signals' },
  { id: 'examlens', icon: GraduationCap, label: 'Exam Lens' },
]

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="app-sidebar">
      {/* Avatar */}
      <div
        className="sidebar-icon-avatar"
        title="User profile"
        style={{ marginBottom: '16px' }}
      >
        <User size={16} />
      </div>

      {/* Nav Icons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`sidebar-icon ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            title={label}
            id={`sidebar-${id}`}
            style={{ border: 'none', outline: 'none', cursor: 'pointer' }}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* Settings at bottom */}
      <button
        className="sidebar-icon"
        title="Settings"
        id="sidebar-settings"
        style={{ border: 'none', outline: 'none', cursor: 'pointer', marginTop: 'auto' }}
      >
        <Settings size={18} />
      </button>
    </aside>
  )
}
