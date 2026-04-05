'use client'

import React from 'react'
import { User } from 'lucide-react'

interface TopNavigationProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export function TopNavigation({ activeTab = 'nexus', onTabChange }: TopNavigationProps) {
  const navItems = [
    { id: 'nexus', label: 'NEXUS' },
    { id: 'archives', label: 'ARCHIVES' },
    { id: 'signals', label: 'SIGNALS' },
    { id: 'exam-lens', label: 'EXAM LENS' },
  ]

  return (
    <div className="h-16 bg-black/40 backdrop-blur-xl border-b border-neutral-900/50 flex items-center justify-between px-8">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center neural-glow">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <h1 className="text-xl font-bold gradient-text">DocMind AI</h1>
        </div>

        <div className="flex items-center space-x-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange?.(item.id)}
              className={`nav-item ${activeTab === item.id ? 'active' : 'text-neutral-400'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-300">
          <User size={20} className="text-neutral-400" />
        </button>
      </div>
    </div>
  )
}
