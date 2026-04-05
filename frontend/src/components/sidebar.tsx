'use client'

import React from 'react'
import { Brain, Book, Activity, Eye } from 'lucide-react'

interface SidebarProps {
  activeItem?: string
  onItemClick?: (item: string) => void
}

export function Sidebar({ activeItem = 'nexus', onItemClick }: SidebarProps) {
  const menuItems = [
    { id: 'nexus', icon: Brain, label: 'NEXUS' },
    { id: 'archives', icon: Book, label: 'ARCHIVES' },
    { id: 'signals', icon: Activity, label: 'SIGNALS' },
    { id: 'exam-lens', icon: Eye, label: 'EXAM LENS' },
  ]

  return (
    <div className="w-20 bg-black/60 backdrop-blur-xl border-r border-neutral-900/50 flex flex-col items-center py-8 space-y-6">
      {menuItems.map((item) => {
        const Icon = item.icon
        const isActive = activeItem === item.id

        return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className={`sidebar-item ${isActive ? 'active' : ''} group relative`}
            title={item.label}
          >
            <Icon
              size={20}
              className={`transition-colors duration-300 ${isActive
                ? 'text-white'
                : 'text-neutral-500 group-hover:text-neutral-300'
                }`}
            />
            <div className="absolute left-full ml-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
              {item.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
