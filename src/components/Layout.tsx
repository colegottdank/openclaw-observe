import { ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'wouter'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation()
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const getActiveTab = (path: string) => {
    if (path === '/') return 'overview'
    if (path.startsWith('/tasks')) return 'tasks'
    if (path.startsWith('/agents')) return 'agents'
    return path.substring(1)
  }

  const activeTab = getActiveTab(location)

  return (
    <div className="flex flex-col h-full bg-neutral-950 relative">
      {/* HEADER */}
      <header className="hidden lg:flex h-14 border-b border-neutral-900 items-center justify-between px-6 bg-neutral-900/20 backdrop-blur shrink-0">
        <div className="flex items-center gap-4 text-sm breadcrumbs text-neutral-500">
          <span className="text-neutral-300">Mission Control</span>
          <span>/</span>
          <span className="capitalize text-white">{activeTab}</span>
        </div>
        <div className="font-mono text-xs text-neutral-500">
          {new Date(currentTime).toISOString().replace('T', ' ').substring(0, 19)} UTC
        </div>
      </header>

      {/* DASHBOARD CONTENT */}
      <main className="flex-1 overflow-auto bg-neutral-950 relative h-full">
        {children}
      </main>
    </div>
  )
}
