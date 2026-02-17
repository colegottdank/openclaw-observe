import { useState, useEffect, useCallback } from 'react'

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  updatedAt?: string
}

interface FileBrowserProps {
  currentPath: string
  onNavigate: (path: string) => void
  className?: string
}

export function FileBrowser({ currentPath, onNavigate, className = '' }: FileBrowserProps) {
  // File Browser State
  const [fileTree, setFileTree] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [statusMsg, setStatusMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch file list when currentPath changes
  useEffect(() => {
    let isMounted = true
    const fetchFiles = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        
        if (isMounted) {
          if (data.type === 'directory') {
            setFileTree(data.files)
          } else if (Array.isArray(data)) {
             setFileTree(data)
          } else {
             // Maybe it's a file if we navigated to a file path by mistake?
             setFileTree([])
          }
        }
      } catch (e) {
        console.error('Error fetching files:', e)
        if (isMounted) setFileTree([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    
    // Reset selection when path changes (unless we are just refreshing)
    setSelectedFile(null)
    fetchFiles()
    
    return () => { isMounted = false }
  }, [currentPath])

  const openFile = async (filePath: string) => {
    try {
      setStatusMsg('Loading...')
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      setFileContent(data.content || '') 
      setSelectedFile(filePath)
      setStatusMsg('')
    } catch (e) {
      console.error(e)
      setStatusMsg('Error loading file')
    }
  }

  const saveFile = useCallback(async () => {
    if (!selectedFile) return
    setStatusMsg('Saving...')
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      })
      setStatusMsg('Saved!')
      setTimeout(() => setStatusMsg(''), 2000)
    } catch (e) {
      setStatusMsg('Error saving')
      console.error(e)
    }
  }, [selectedFile, fileContent])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        if (selectedFile) {
          e.preventDefault()
          saveFile()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, selectedFile])

  // Generate breadcrumbs
  const breadcrumbs = currentPath.split('/').filter(Boolean).reduce((acc, part, index, arr) => {
      const path = '/' + arr.slice(0, index + 1).join('/')
      acc.push({ name: part, path })
      return acc
  }, [] as { name: string, path: string }[])

  return (
    <div className={`flex flex-col lg:flex-row h-full border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/30 ${className}`}>
      
      {/* FILE EXPLORER SIDEBAR */}
      {/* Mobile: Full width if no file selected. Desktop: w-72 fixed */}
      <div className={`
        flex-col bg-neutral-900/50 border-r border-neutral-800 backdrop-blur-sm
        ${selectedFile ? 'hidden lg:flex lg:w-72' : 'flex w-full lg:w-72'}
      `}>
        
        {/* Breadcrumb Header */}
        <div className="h-10 px-3 text-xs border-b border-neutral-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap shrink-0">
            <button 
                onClick={() => onNavigate('/')}
                className={`hover:text-white px-1 py-0.5 rounded font-mono ${currentPath === '/' ? 'text-white font-bold' : 'text-neutral-500'}`}
            >
                ~
            </button>
            {breadcrumbs.map((b, i) => (
                <div key={b.path + i} className="flex items-center gap-1 shrink-0">
                    <span className="text-neutral-600">/</span>
                    <button 
                        onClick={() => onNavigate(b.path)}
                        className="text-neutral-500 hover:text-white max-w-[120px] truncate font-mono"
                        title={b.name}
                    >
                        {b.name}
                    </button>
                </div>
            ))}
        </div>

        {/* Navigation Bar */}
        <div className="p-2 border-b border-neutral-800/50 flex items-center justify-between text-xs bg-neutral-900/80 shrink-0">
            <span className="text-neutral-500 font-mono pl-1">
                {fileTree.length} items
            </span>
            {currentPath !== '/' && (
                <button 
                  onClick={() => {
                    const parts = currentPath.split('/').filter(p => p)
                    parts.pop()
                    onNavigate(parts.length === 0 ? '/' : parts.join('/'))
                  }}
                  className="text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 flex items-center gap-1"
                >
                  <span className="text-lg leading-none">↑</span> Up
                </button>
            )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoading ? (
                <div className="p-8 text-xs text-neutral-500 text-center animate-pulse">Loading...</div>
            ) : fileTree.length === 0 ? (
                <div className="p-8 text-xs text-neutral-600 text-center border-2 border-dashed border-neutral-800/50 rounded m-2">
                    Empty directory
                </div>
            ) : (
                fileTree.map((file, i) => (
                    <button
                        key={file.path || i}
                        onClick={() => {
                            if (file.isDirectory) {
                                onNavigate(file.path)
                            } else {
                                openFile(file.path)
                            }
                        }}
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 text-sm font-mono transition-colors border border-transparent ${
                            selectedFile === file.path
                                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                        }`}
                        title={file.name}
                    >
                        <span className="opacity-50 text-base">{file.isDirectory ? '📁' : '📄'}</span>
                        <span className="truncate">{file.name}</span>
                    </button>
                ))
            )}
        </div>
      </div>

      {/* EDITOR AREA */}
      {/* Mobile: Full width only if file selected. Desktop: flex-1 */}
      <div className={`
        flex-col bg-neutral-950 relative
        ${selectedFile ? 'flex w-full lg:flex-1' : 'hidden lg:flex lg:flex-1'}
      `}>
          {selectedFile ? (
              <>
                  <div className="h-12 border-b border-neutral-800 flex items-center px-3 bg-neutral-900/30 text-xs select-none shrink-0 justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                          {/* Back Button (Mobile Only) */}
                          <button 
                            onClick={() => setSelectedFile(null)}
                            className="lg:hidden p-1.5 -ml-1 text-neutral-400 hover:text-white bg-neutral-800/50 rounded-md"
                          >
                            ←
                          </button>
                          
                          <div className="flex items-center gap-2 text-neutral-300 truncate">
                              <span className="text-base opacity-70">📄</span>
                              <span className="font-mono font-medium truncate">{selectedFile.split('/').pop()}</span>
                          </div>
                      </div>

                      <div className="flex items-center gap-2 pl-2 shrink-0">
                          {statusMsg && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  statusMsg.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                  {statusMsg}
                              </span>
                          )}
                          <button 
                            onClick={saveFile}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>Save</span>
                            <span className="opacity-50 text-[10px] hidden sm:inline">⌘S</span>
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 relative overflow-hidden">
                      <textarea 
                          className="absolute inset-0 w-full h-full bg-[#0d0d0d] p-4 font-mono text-xs sm:text-sm text-neutral-300 focus:outline-none resize-none leading-relaxed"
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          spellCheck={false}
                      />
                  </div>
              </>
          ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-700 flex-col gap-4 select-none p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-900/30 flex items-center justify-center text-4xl opacity-20 border border-neutral-800/50">
                      ←
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Select a file to edit</p>
                    <p className="text-xs text-neutral-600 mt-1">
                        Browse the workspace on the left
                    </p>
                  </div>
              </div>
          )}
      </div>
    </div>
  )
}
