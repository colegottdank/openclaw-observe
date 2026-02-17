import { useState, useRef, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'openclaw-panel-width'
const MIN_WIDTH = 320
const MAX_WIDTH_RATIO = 0.85

interface ResizablePanelProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  storageKey?: string
  defaultWidth?: number
}

export function ResizablePanel({
  open,
  onClose,
  children,
  storageKey = 'default',
  defaultWidth = 480,
}: ResizablePanelProps) {
  const fullKey = `${STORAGE_KEY}-${storageKey}`

  const [width, setWidth] = useState(() => {
    try {
      const saved = sessionStorage.getItem(fullKey)
      if (saved) return Math.max(MIN_WIDTH, parseInt(saved, 10))
    } catch {}
    return defaultWidth
  })

  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Persist width to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(fullKey, String(width))
    } catch {}
  }, [width, fullKey])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      const delta = startX.current - e.clientX
      const newWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        style={{ width: `${width}px`, maxWidth: `${MAX_WIDTH_RATIO * 100}%` }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group hover:bg-indigo-500/30 transition-colors"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-neutral-700 group-hover:bg-indigo-500 transition-colors" />
        </div>

        {children}
      </div>
    </div>
  )
}
