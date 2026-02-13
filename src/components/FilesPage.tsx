import { useEffect, useState } from 'react'
import { FileBrowser } from './FileBrowser'

export function FilesPage() {
  // Parse query param
  const getPathFromUrl = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('path') || '/'
  }

  const [path, setPath] = useState(getPathFromUrl())

  // Sync back to URL
  const handleNavigate = (newPath: string) => {
    setPath(newPath)
    const url = new URL(window.location.href)
    url.searchParams.set('path', newPath)
    window.history.pushState({}, '', url.toString())
  }

  // Handle browser back button (popstate)
  useEffect(() => {
      const handlePopState = () => {
          setPath(getPathFromUrl())
      }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return (
    <div className="h-full p-4 flex flex-col">
       <div className="flex-1 overflow-hidden">
            <FileBrowser currentPath={path} onNavigate={handleNavigate} className="h-full shadow-2xl bg-neutral-900/40" />
       </div>
    </div>
  )
}
