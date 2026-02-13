import { useState, useEffect, useCallback, useRef } from 'react'
import { getOpenClawId } from '../utils/agentMapping'
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Search, 
  Filter, 
  AlertCircle, 
  MessageSquare, 
  Terminal,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface Agent {
  _id: string
  name: string
  status: string
  role?: string
  version?: string
  emoji?: string
  [key: string]: any
}

interface Session {
  sessionId: string
  agentId: string
  updatedAt: number;
  status: string;
  kind?: string;
  channel?: string;
  displayName?: string;
  lastTo?: string;
  deliveryContext?: any;
}

export function AgentDetail({ agent, onBack }: { agent: Agent, onBack: () => void }) {
  const searchParams = new URLSearchParams(window.location.search)
  const initialTab = searchParams.get('tab') || 'overview'

  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'sessions'>(initialTab as any)
  
  // File Browser State
  const agentOpenClawId = getOpenClawId(agent)
  
  // MAPPING LOGIC FOR FILE PATHS
  // Spud (main) -> workspace root
  // DebateAI agents -> agents/debateai/<name>
  // Other agents (doctor, sketch) -> agents/<id>
  
  let initialPath = '';
  if (agentOpenClawId === 'main') {
      initialPath = '';
  } else if (agentOpenClawId.startsWith('debateai-')) {
      // e.g. debateai-atlas -> agents/debateai/atlas
      const name = agentOpenClawId.replace('debateai-', '');
      initialPath = `agents/debateai/${name}`;
  } else {
      initialPath = `agents/${agentOpenClawId}`;
  }
  
  const [fileTree, setFileTree] = useState<any[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [statusMsg, setStatusMsg] = useState('')
  
  // Session State
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionLogs, setSessionLogs] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Trace Viewer State
  const [filter, setFilter] = useState<'all' | 'user' | 'error'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedTools, setCollpasedTools] = useState<Set<number>>(new Set())
  const logContainerRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFiles = useCallback(async (pathStr: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(pathStr)}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      
      if (data.type === 'directory') {
        setFileTree(data.files)
      } else if (Array.isArray(data)) {
         setFileTree(data)
      }
    } catch (e) {
      console.error('Error fetching files:', e)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true)
    setError(null)
    try {
      const agentId = getOpenClawId(agent)
      const res = await fetch(`/api/sessions?agentId=${agentId}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const data = await res.json()
      data.sort((a: Session, b: Session) => (b.updatedAt || 0) - (a.updatedAt || 0))
      setSessions(data)
    } catch (e) {
      console.error('Error fetching sessions:', e)
      setError('Error loading sessions.')
    } finally {
      setLoadingSessions(false)
    }
  }, [agent.name])

  const fetchSessionLogs = useCallback(async (sessionId: string) => {
    try {
      const agentId = getOpenClawId(agent)
      const res = await fetch(`/api/sessions/${agentId}/${sessionId}`)
      const text = await res.text()
      const logs = text.trim().split('\n').map(line => {
        try { return JSON.parse(line) } catch (e) { return null }
      }).filter(Boolean)
      setSessionLogs(logs)
    } catch (e) {
      console.error('Polling error', e)
    }
  }, [agent])

  const openSession = useCallback(async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setLoadingLogs(true)
    await fetchSessionLogs(sessionId)
    setLoadingLogs(false)
  }, [fetchSessionLogs])

  // Polling for live updates
  useEffect(() => {
    if (selectedSessionId) {
        // Start polling
        pollingRef.current = setInterval(() => {
            fetchSessionLogs(selectedSessionId)
        }, 3000)
    }
    
    return () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }
  }, [selectedSessionId, fetchSessionLogs])

  useEffect(() => {
    if (activeTab === 'files') {
      fetchFiles(currentPath)
    } else if (activeTab === 'sessions') {
      fetchSessions()
    }
  }, [activeTab, currentPath, fetchFiles, fetchSessions])

  const openFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      setFileContent(data.content) 
      setSelectedFile(filePath)
    } catch (e) {
      console.error(e)
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
      if (e.key === 'Escape') {
        if (selectedFile) {
            setSelectedFile(null)
        } else if (selectedSessionId) {
            setSelectedSessionId(null)
        } else {
            onBack()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, selectedFile, selectedSessionId, onBack])

  const handleNavigate = (pathStr: string) => {
      setCurrentPath(pathStr)
      setSelectedFile(null)
  }

  const goUp = () => {
      if (!currentPath || currentPath === initialPath) return
      const parts = currentPath.split('/')
      parts.pop()
      handleNavigate(parts.join('/'))
  }

  const scrollToBottom = () => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }

  const toggleToolCollapse = (index: number) => {
      const newSet = new Set(collapsedTools)
      if (newSet.has(index)) {
          newSet.delete(index)
      } else {
          newSet.add(index)
      }
      setCollpasedTools(newSet)
  }

  // Auto-scroll when logs load
  useEffect(() => {
      if (sessionLogs.length > 0) {
          // Small delay to allow render
          setTimeout(scrollToBottom, 100)
      }
  }, [sessionLogs])

  // Render helpers (same as before)
  const renderLogEntry = (entry: any, index: number) => {
    // Filter logic
    if (filter === 'user' && entry.message?.role !== 'user') return null;
    if (filter === 'error') {
        const isError = entry.type === 'error' || (entry.type === 'tool_result' && entry.isError) || (JSON.stringify(entry).toLowerCase().includes('error'));
        if (!isError) return null;
    }
    if (searchTerm && !JSON.stringify(entry).toLowerCase().includes(searchTerm.toLowerCase())) return null;

    // Timestamp handling - only show if > 5m gap or first entry
    const timestamp = entry.ts || entry.timestamp || entry.createdAt;
    const date = timestamp ? new Date(timestamp) : null;
    const timeStr = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

    if (entry.type === 'message') {
       const msg = entry.message;
       const role = msg?.role || 'unknown';
       const content = msg?.content; 
       
       let blocks: any[] = [];
       if (typeof content === 'string') {
         blocks.push({ type: 'text', text: content });
       } else if (Array.isArray(content)) {
         blocks = content;
       }

       if (role === 'toolResult' || role === 'tool') {
          const isCollapsed = collapsedTools.has(index);
          return (
            <div key={index} className="flex gap-4 p-2 bg-neutral-900/40 border-l-2 border-emerald-500/50 my-1 mx-4 group text-xs">
                 <button onClick={() => toggleToolCollapse(index)} className="w-16 shrink-0 flex flex-col items-end hover:text-white text-emerald-500 cursor-pointer">
                    <span className="font-bold uppercase flex items-center gap-1">
                        {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                        Output
                    </span>
                    {timeStr && <span className="text-[9px] font-mono text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">{timeStr}</span>}
                 </button>
                 <div className="flex-1 font-mono text-emerald-200/80 overflow-x-auto">
                    {isCollapsed ? (
                        <div className="opacity-50 italic truncate cursor-pointer" onClick={() => toggleToolCollapse(index)}>
                            {JSON.stringify(blocks[0] || entry).slice(0, 100)}...
                        </div>
                    ) : (
                        blocks.map((b: any, i: number) => (
                            <div key={i} className="whitespace-pre-wrap">{b.text || JSON.stringify(b)}</div>
                        ))
                    )}
                 </div>
            </div>
          );
       }

       return (
         <div key={index} className={`flex gap-4 p-4 group ${role === 'user' ? 'bg-neutral-900/20' : 'bg-transparent'}`}>
            <div className={`w-16 shrink-0 flex flex-col items-end`}>
              <span className={`text-xs font-bold uppercase ${role === 'user' ? 'text-blue-400' : 'text-purple-400'}`}>
                {role}
              </span>
              {timeStr && <span className="text-[9px] font-mono text-neutral-600 mt-1 opacity-50 group-hover:opacity-100 transition-opacity">{timeStr}</span>}
            </div>
            <div className="flex-1 text-sm font-mono text-neutral-300 space-y-2 overflow-x-auto">
              {blocks.map((block: any, i: number) => {
                if (block.type === 'thinking') {
                  return (
                    <div key={i} className="text-neutral-500 italic border-l-2 border-neutral-700 pl-3 py-1 text-xs">
                      {block.thinking}
                    </div>
                  );
                }
                if (block.type === 'toolCall') {
                    const isCollapsed = collapsedTools.has(index + i); // Use composite key for internal blocks? Simpler to just not collapse internal blocks for now or treat whole message as collapsible
                    return (
                        <div key={i} className="bg-neutral-900/40 border-l-2 border-amber-500/50 p-2 my-2 rounded-sm">
                            <div className="flex justify-between items-start mb-1">
                                <div className="text-xs font-bold text-amber-500">Tool Call: {block.name}</div>
                            </div>
                            <pre className="text-xs text-amber-200/80 whitespace-pre-wrap break-all">
                                {typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments, null, 2)}
                            </pre>
                        </div>
                    );
                }
                if (block.type === 'text') {
                   return <div key={i} className="whitespace-pre-wrap">{block.text}</div>;
                }
                return <div key={i} className="text-neutral-600 text-xs">{JSON.stringify(block)}</div>;
              })}
            </div>
         </div>
       )
    }

    if (entry.type === 'tool_use' || (entry.tool && entry.input)) { // heuristics
        const isCollapsed = collapsedTools.has(index);
        return (
            <div key={index} className="flex gap-4 p-2 bg-neutral-900/40 border-l-2 border-amber-500/50 my-1 mx-4 group text-xs">
                 <button onClick={() => toggleToolCollapse(index)} className="w-16 shrink-0 flex flex-col items-end hover:text-white text-amber-500 cursor-pointer">
                    <span className="font-bold uppercase flex items-center gap-1">
                        {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                        Tool
                    </span>
                    {timeStr && <span className="text-[9px] font-mono text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">{timeStr}</span>}
                 </button>
                 <div className="flex-1 font-mono text-amber-200/80">
                    {isCollapsed ? (
                        <div className="opacity-50 italic truncate cursor-pointer" onClick={() => toggleToolCollapse(index)}>
                            <span className="font-bold">{entry.tool || entry.name}</span>
                            <span className="opacity-50 ml-2">{JSON.stringify(entry.input || entry.args)}</span>
                        </div>
                    ) : (
                        <>
                            <span className="font-bold">{entry.tool || entry.name}</span>
                            <pre className="opacity-80 mt-1 whitespace-pre-wrap">{JSON.stringify(entry.input || entry.args, null, 2)}</pre>
                        </>
                    )}
                 </div>
            </div>
        )
    }
    if (entry.type === 'tool_result' || entry.output) {
         const isCollapsed = collapsedTools.has(index);
         return (
            <div key={index} className="flex gap-4 p-2 bg-neutral-900/40 border-l-2 border-emerald-500/50 my-1 mx-4 group text-xs">
                 <button onClick={() => toggleToolCollapse(index)} className="w-16 shrink-0 flex flex-col items-end hover:text-white text-emerald-500 cursor-pointer">
                    <span className="font-bold uppercase flex items-center gap-1">
                        {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                        Output
                    </span>
                    {timeStr && <span className="text-[9px] font-mono text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">{timeStr}</span>}
                 </button>
                 <div className="flex-1 font-mono text-emerald-200/80 line-clamp-4 hover:line-clamp-none cursor-pointer">
                    {isCollapsed ? (
                        <div className="opacity-50 italic truncate" onClick={() => toggleToolCollapse(index)}>
                            {typeof entry.output === 'string' ? entry.output : JSON.stringify(entry.output)}
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap break-all" onClick={() => toggleToolCollapse(index)}>
                            {typeof entry.output === 'string' ? entry.output : JSON.stringify(entry.output, null, 2)}
                        </div>
                    )}
                 </div>
            </div>
        )
    }
    return null; 
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-300">
      {/* HEADER */}
      <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                if (selectedSessionId) setSelectedSessionId(null);
                else onBack();
            }}
            className="p-2 hover:bg-neutral-800 rounded-md text-neutral-500 hover:text-white transition-colors"
          >
            ← {selectedSessionId ? 'Sessions' : 'Back'}
          </button>
          <div className="w-px h-6 bg-neutral-800"></div>
          <div className="flex items-center gap-3">
             <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                agent.status === 'idle' ? 'bg-amber-500/10 text-amber-500' :
                'bg-neutral-800 text-neutral-500'
              }`}>
                {agent.emoji || agent.name[0]}
              </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">{agent.name}</h1>
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mt-1">
                <span>{selectedSessionId || agent._id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        {!selectedSessionId && (
            <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            {['overview', 'files', 'sessions'].map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                    activeTab === tab 
                    ? 'bg-neutral-800 text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                }`}
                >
                {tab}
                </button>
            ))}
            </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && !selectedSessionId && (
          <div className="p-8 max-w-4xl mx-auto w-full">
             <div className="grid grid-cols-2 gap-6">
                <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-white mb-4">Agent Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Uptime</span>
                            <span className="font-mono text-emerald-400">12h 45m</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Tasks Completed</span>
                            <span className="font-mono text-indigo-400">142</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Memory Usage</span>
                            <span className="font-mono text-neutral-300">256MB</span>
                        </div>
                    </div>
                </div>
                
                 <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-white mb-4">Recent Activity</h3>
                    <div className="text-sm text-neutral-500 text-center py-8">
                        No recent activity logs available.
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && !selectedSessionId && (
          <div className="flex h-full">
            {/* FILE EXPLORER */}
            <div className="w-64 bg-neutral-900/30 border-r border-neutral-800 flex flex-col">
              <div className="p-3 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-800 flex justify-between items-center">
                <span>Workspace</span>
                {(currentPath && currentPath !== initialPath) && (
                    <button onClick={goUp} className="hover:text-white" title="Go Up">↑</button>
                )}
              </div>
              <div className="px-3 py-2 text-xs text-neutral-600 font-mono break-all border-b border-neutral-800/50">
                  {currentPath || '/'}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {fileTree.map((file, i) => (
                    <button
                        key={file.path || i}
                        onClick={() => file.isDirectory ? handleNavigate(file.path) : openFile(file.path)}
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 text-sm font-mono transition-colors ${
                            selectedFile === file.path
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                        }`}
                    >
                        <span className="opacity-50">{file.isDirectory ? '📁' : '📄'}</span>
                        <span className="truncate">{file.name}</span>
                    </button>
                ))}
                {fileTree.length === 0 && (
                    <div className="text-xs text-neutral-600 p-2 text-center">Empty directory</div>
                )}
              </div>
            </div>

            {/* EDITOR */}
            <div className="flex-1 flex flex-col bg-neutral-950">
                {selectedFile ? (
                    <>
                        <div className="h-10 border-b border-neutral-800 flex items-center px-4 bg-neutral-900/20">
                            <span className="text-xs text-neutral-500 font-mono">{selectedFile}</span>
                            <div className="ml-auto flex items-center gap-3">
                                {statusMsg && <span className="text-xs text-emerald-500 animate-pulse">{statusMsg}</span>}
                                <span className="text-[10px] text-neutral-600 uppercase tracking-wider">
                                    CMD+S to Save
                                </span>
                            </div>
                        </div>
                        <textarea 
                            className="flex-1 bg-transparent p-4 font-mono text-sm text-neutral-300 focus:outline-none resize-none leading-relaxed"
                            value={fileContent}
                            onChange={(e) => setFileContent(e.target.value)}
                            spellCheck={false}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-neutral-600 flex-col gap-2">
                        <div className="text-4xl opacity-20">📝</div>
                        <p>Select a file to edit</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && !selectedSessionId && (
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-neutral-900/50 sticky top-0 z-10 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-3 font-medium text-neutral-500 w-12"></th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Session ID</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Context</th>
                            <th className="px-6 py-3 font-medium text-neutral-500 text-right">Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {loadingSessions ? (
                            <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Loading sessions...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={4} className="p-8 text-center text-red-500">{error}</td></tr>
                        ) : sessions.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-neutral-500">No sessions found.</td></tr>
                        ) : (
                            sessions.map((session) => (
                                <tr 
                                    key={session.sessionId}
                                    onClick={() => openSession(session.sessionId)}
                                    className="hover:bg-neutral-900/40 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className={`w-2 h-2 rounded-full ${
                                            session.status === 'active' ? 'bg-emerald-500 animate-pulse' : 
                                            session.status === 'aborted' ? 'bg-red-500' : 'bg-neutral-600'
                                        }`} />
                                    </td>
                                    <td className="px-6 py-4 font-mono text-neutral-300 group-hover:text-white">
                                        {session.sessionId.split('-')[0]}...
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400">
                                        <div className="flex flex-col gap-1">
                                            {session.channelName && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                                    {session.channelName}
                                                </span>
                                            )}
                                            <span className="truncate max-w-[300px] text-xs font-mono text-neutral-300">
                                                {session.summary || session.displayName || 'Unknown Context'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-500 font-mono text-xs">
                                        {new Date(session.updatedAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* TRACE VIEWER */}
        {selectedSessionId && (
            <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 relative">
                {/* TOOLBAR */}
                <div className="h-12 border-b border-neutral-800 bg-neutral-900/30 flex items-center px-4 gap-4 shrink-0 z-10">
                    <div className="flex bg-neutral-800/50 rounded-md p-0.5 border border-neutral-800">
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${filter === 'all' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('user')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${filter === 'user' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <MessageSquare size={12} />
                            Messages
                        </button>
                        <button 
                            onClick={() => setFilter('error')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${filter === 'error' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <AlertCircle size={12} />
                            Errors
                        </button>
                    </div>

                    <div className="h-4 w-px bg-neutral-800"></div>

                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-md py-1.5 pl-8 pr-3 text-xs text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                    </div>

                    <button 
                        onClick={scrollToBottom}
                        className="p-1.5 text-neutral-500 hover:text-white bg-neutral-800/50 hover:bg-neutral-800 rounded transition-colors"
                        title="Jump to Bottom"
                    >
                        <ArrowDownCircle size={16} />
                    </button>
                </div>

                <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
                    {loadingLogs ? (
                        <div className="text-center p-12 text-neutral-500 animate-pulse">Loading trace...</div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-2 pb-12">
                            {sessionLogs.length === 0 ? (
                                <div className="text-center p-12 text-neutral-500">Empty session log.</div>
                            ) : (
                                sessionLogs.map((entry, i) => renderLogEntry(entry, i))
                            )}
                            {sessionLogs.length > 0 && <div className="h-8" />} {/* Bottom spacer */}
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  )
}
