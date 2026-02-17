import { useState, useEffect, memo } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'wouter'

interface LayoutProps {
  children: ReactNode
}

const ClockDisplay = memo(function ClockDisplay() {
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="font-mono text-xs text-neutral-500">
      {new Date(currentTime).toISOString().replace('T', ' ').substring(0, 19)} UTC
    </div>
  )
})

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation()

  const getActiveTab = (path: string) => {
    if (path === '/') return 'overview'
    if (path.startsWith('/agents')) return 'agents'
    return path.substring(1)
  }

  const activeTab = getActiveTab(location)

  return (
    <div className="flex flex-col h-full bg-neutral-950 relative">
      {/* HEADER */}
      <header className="hidden lg:flex h-14 border-b border-neutral-900 items-center justify-between px-6 bg-neutral-900/20 backdrop-blur shrink-0">
        <div className="flex items-center gap-4 text-sm breadcrumbs text-neutral-500">
          <span className="text-neutral-300">OpenClaw</span>
          <span>/</span>
          <span className="capitalize text-white">{activeTab}</span>
        </div>
        <ClockDisplay />
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="flex-1 overflow-auto bg-neutral-950 relative h-full">
        {children}
      </main>
    </div>
  )
}
