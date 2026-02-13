import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from './convex'
import { Link, Route, Switch, useLocation } from 'wouter'
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  FolderOpen, 
  Terminal, 
  Rocket, 
  Settings,
  Menu,
  X
} from 'lucide-react'

// Components
import { AgentDetail } from './components/AgentDetail'
import { Layout } from './components/Layout'
import { Overview } from './components/Overview'
import { TasksPage } from './components/TasksPage'
import { AgentsList } from './components/AgentsList'
import { FilesPage } from './components/FilesPage'
import { LogsPage } from './components/LogsPage'
import { SettingsPage } from './components/SettingsPage'
import { NotFound } from './components/NotFound'
import { TimelinePage } from './components/TimelinePage'

export default function App() {
  const [location, setLocation] = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Real Data
  const agents = useQuery(api.agents.list as any) || []
  const activities = useQuery(api.activities.feed as any) || []
  const tasks = useQuery(api.tasks.list as any) || []

  // Augmented Agent Data
  const augmentedAgents = agents.map((agent: any) => ({
    ...agent,
    task: agent.status === 'busy' ? 'Processing task...' : (agent.status === 'idle' ? 'Awaiting instructions' : 'Offline'),
    cpu: Math.floor(Math.random() * 30) + 10,
    memory: Math.floor(Math.random() * 200) + 100,
    version: 'v1.0.0'
  }))

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Timeline', path: '/timeline', icon: Terminal },
    { label: 'Agents', path: '/agents', icon: Users },
    { label: 'Files', path: '/files', icon: FolderOpen },
    { label: 'Logs', path: '/logs', icon: Terminal },
    { label: 'Settings', path: '/settings', icon: Settings }
  ]

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-300 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-900 flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:w-64 lg:bg-neutral-900/30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-14 flex items-center justify-between px-6 border-b border-neutral-900">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">MC</div>
            <span className="ml-3 font-bold text-neutral-100 tracking-tight">OpenClaw</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path))
            const Icon = item.icon
            return (
              <Link 
                key={item.label}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800 text-white font-medium' 
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-neutral-900">
          <div className="text-xs font-mono text-neutral-600 mb-2">SYSTEM STATUS</div>
          <div className="flex items-center gap-2 text-xs text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Operational
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
        
        {/* MOBILE HEADER */}
        <div className="lg:hidden h-14 border-b border-neutral-900 flex items-center px-4 bg-neutral-900/50 backdrop-blur shrink-0 justify-between">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="text-neutral-400 hover:text-white">
               <Menu className="w-5 h-5" />
             </button>
             <span className="font-bold text-neutral-100">Mission Control</span>
           </div>
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>

        <Switch>
          <Route path="/agents/:id">
            {(params: { id: string }) => {
               const agent = augmentedAgents.find((a: any) => a._id === params.id)
               if (!agent) return <div className="p-6">Agent not found</div>
               return <AgentDetail agent={agent} onBack={() => setLocation('/agents')} />
            }}
          </Route>
          
          <Route path="/">
             <Layout>
                <Overview agents={agents} augmentedAgents={augmentedAgents} tasks={tasks} activities={activities} />
             </Layout>
          </Route>

          <Route path="/tasks">
             <Layout>
                <TasksPage tasks={tasks} agents={agents} />
             </Layout>
          </Route>

          <Route path="/timeline">
             <Layout>
                <TimelinePage />
             </Layout>
          </Route>

          <Route path="/agents">
             <Layout>
                <AgentsList augmentedAgents={augmentedAgents} />
             </Layout>
          </Route>

          <Route path="/files">
             <Layout>
                <FilesPage />
             </Layout>
          </Route>

          <Route path="/logs">
             <Layout>
                <LogsPage />
             </Layout>
          </Route>

          <Route path="/settings">
             <Layout>
                <SettingsPage />
             </Layout>
          </Route>

          {/* Catch-all for 404s */}
          <Route path="/:rest*">
             <Layout>
                <NotFound />
             </Layout>
          </Route>
        </Switch>
      </div>
    </div>
  )
}
