import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'DocMind AI - Document Intelligence System',
  description: 'Chat with your documents. Get trustworthy, source-grounded AI answers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white dark:bg-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
