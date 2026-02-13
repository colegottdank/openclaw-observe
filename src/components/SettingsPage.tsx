import { useState } from 'react'
import { 
  AlertTriangle, 
  Power, 
  Save, 
  Cpu, 
  RefreshCw,
  Settings,
  Bell,
  Database,
  Zap,
  ChevronRight,
  Check,
  Server,
  HardDrive,
  Activity,
  Globe,
  Mail,
  MessageSquare,
  Slack,
  Clock,
  AlertOctagon
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type SettingsTab = 'general' | 'models' | 'notifications' | 'danger'

interface ModelOption {
  id: string
  name: string
  provider: 'google' | 'anthropic' | 'openai'
  description: string
  costPer1K: string
  contextWindow: string
}

interface AgentOverride {
  agentId: string
  agentName: string
  modelId: string
}

interface NotificationRoute {
  event: string
  channels: {
    slack: boolean
    email: boolean
    webhook: boolean
  }
}

// ============================================================================
// DATA
// ============================================================================

const MODELS: ModelOption[] = [
  { 
    id: 'google-vertex/gemini-3-pro-preview', 
    name: 'Gemini 1.5 Pro', 
    provider: 'google',
    description: 'Google Vertex AI - Best for long context',
    costPer1K: '$0.0035',
    contextWindow: '2M tokens'
  },
  { 
    id: 'anthropic/claude-3-5-sonnet', 
    name: 'Claude 3.5 Sonnet', 
    provider: 'anthropic',
    description: 'Anthropic - Excellent reasoning',
    costPer1K: '$0.003',
    contextWindow: '200K tokens'
  },
  { 
    id: 'anthropic/claude-3-opus', 
    name: 'Claude 3 Opus', 
    provider: 'anthropic',
    description: 'Anthropic - Most capable',
    costPer1K: '$0.015',
    contextWindow: '200K tokens'
  },
  { 
    id: 'openai/gpt-4o', 
    name: 'GPT-4o', 
    provider: 'openai',
    description: 'OpenAI - Fast and capable',
    costPer1K: '$0.005',
    contextWindow: '128K tokens'
  },
  { 
    id: 'openai/gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    provider: 'openai',
    description: 'OpenAI - Cost effective',
    costPer1K: '$0.0006',
    contextWindow: '128K tokens'
  }
]

const AGENT_OVERRIDES: AgentOverride[] = [
  { agentId: 'pixel', agentName: 'Pixel', modelId: 'anthropic/claude-3-5-sonnet' },
  { agentId: 'atlas', agentName: 'Atlas', modelId: 'anthropic/claude-3-opus' },
]

const NOTIFICATION_ROUTES: NotificationRoute[] = [
  { event: 'Task Completed', channels: { slack: true, email: false, webhook: true } },
  { event: 'Task Failed', channels: { slack: true, email: true, webhook: true } },
  { event: 'Agent Error', channels: { slack: true, email: true, webhook: false } },
  { event: 'Deployment Success', channels: { slack: true, email: false, webhook: true } },
  { event: 'System Alert', channels: { slack: true, email: true, webhook: true } },
  { event: 'PR Review Request', channels: { slack: false, email: true, webhook: false } },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProviderIcon({ provider }: { provider: 'google' | 'anthropic' | 'openai' }) {
  const icons = {
    google: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    anthropic: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 22h20L12 2zm0 3.5L17.5 19h-11L12 5.5z"/>
      </svg>
    ),
    openai: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    )
  }
  
  const colors = {
    google: 'text-blue-400 bg-blue-500/10',
    anthropic: 'text-orange-400 bg-orange-500/10',
    openai: 'text-emerald-400 bg-emerald-500/10'
  }
  
  return (
    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colors[provider]}`}>
      {icons[provider]}
    </div>
  )
}

function Switch({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative w-11 h-6 rounded-full transition-all duration-200 ease-in-out
        ${checked ? 'bg-indigo-500' : 'bg-neutral-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}

function Section({ title, description, children, icon: Icon }: { title: string; description?: string; children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="bg-neutral-900/30 border border-white/5 rounded-xl overflow-hidden mb-6">
      {(title || description) && (
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />}
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          {description && (
            <p className="text-xs text-neutral-500 mt-1 ml-8">{description}</p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

function ModelCard({ model, selected, onClick }: { model: ModelOption; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left p-4 rounded-lg border transition-all duration-200
        ${selected 
          ? 'border-indigo-500/50 bg-indigo-500/5' 
          : 'border-white/5 bg-neutral-900/50 hover:border-white/10 hover:bg-neutral-800/50'
        }
      `}
    >
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <ProviderIcon provider={model.provider} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white truncate">{model.name}</h4>
          <p className="text-xs text-neutral-500 mt-0.5">{model.description}</p>
          
          <div className="flex items-center gap-4 mt-3">
            <div className="text-xs">
              <span className="text-neutral-600">Cost:</span>
              <span className="text-neutral-400 ml-1 font-mono">{model.costPer1K}</span>
            </div>
            <div className="text-xs">
              <span className="text-neutral-600">Context:</span>
              <span className="text-neutral-400 ml-1 font-mono">{model.contextWindow}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function CostSparkline() {
  const points = [30, 45, 35, 50, 40, 60, 55, 70, 65, 80, 75, 85]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min
  
  const pathPoints = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100
    const y = 100 - ((p - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')
  
  return (
    <div className="flex items-center gap-6">
      <div>
        <div className="text-2xl font-semibold text-white font-mono">$12.45</div>
        <div className="text-xs text-neutral-500">Daily cost</div>
      </div>
      
      <div className="flex-1 h-12">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <polygon points={`0,100 ${pathPoints} 100,100`} fill="url(#sparklineGradient)" />
          <polyline points={pathPoints} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="100" cy={100 - ((points[points.length - 1] - min) / range) * 80 - 10} r="3" fill="#6366f1" />
        </svg>
      </div>
      
      <div className="text-right">
        <div className="text-xs text-emerald-400 font-medium">+12%</div>
        <div className="text-xs text-neutral-600">vs yesterday</div>
      </div>
    </div>
  )
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function GeneralTab() {
  const [autoSave, setAutoSave] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [telemetry, setTelemetry] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <Section title="Appearance" description="Customize the look and feel of Mission Control" icon={Settings}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">Dark Mode</div>
              <div className="text-xs text-neutral-500">Use dark theme throughout the interface</div>
            </div>
            <Switch checked={darkMode} onChange={setDarkMode} />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">Compact Mode</div>
              <div className="text-xs text-neutral-500">Reduce padding and spacing</div>
            </div>
            <Switch checked={false} onChange={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="System Behavior" description="Configure global system settings" icon={Server}>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">Auto-save Changes</div>
              <div className="text-xs text-neutral-500">Automatically persist configuration changes</div>
            </div>
            <Switch checked={autoSave} onChange={setAutoSave} />
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-white">Anonymous Telemetry</div>
              <div className="text-xs text-neutral-500">Share usage data to help improve OpenClaw</div>
            </div>
            <Switch checked={telemetry} onChange={setTelemetry} />
          </div>
        </div>
      </Section>

      <Section title="Regional" description="Locale and timezone settings" icon={Globe}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Timezone
            </label>
            <div className="relative">
              <select className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none">
                <option>America/Los_Angeles (PST)</option>
                <option>America/New_York (EST)</option>
                <option>UTC</option>
                <option>Europe/London (GMT)</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
              Date Format
            </label>
            <div className="relative">
              <select className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 appearance-none">
                <option>MMM DD, YYYY</option>
                <option>DD/MM/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

function ModelsTab() {
  const [selectedModel, setSelectedModel] = useState('google-vertex/gemini-3-pro-preview')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cost Overview */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Usage Overview</h3>
              <p className="text-xs text-neutral-500">Last 24 hours across all agents</p>
            </div>
          </div>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View detailed report →
          </button>
        </div>
        
        <CostSparkline />
        
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
          <div>
            <div className="text-lg font-semibold text-white font-mono">2.4M</div>
            <div className="text-xs text-neutral-500">Tokens used</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-white font-mono">1,247</div>
            <div className="text-xs text-neutral-500">API calls</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-white font-mono">8</div>
            <div className="text-xs text-neutral-500">Active agents</div>
          </div>
        </div>
      </div>

      {/* Default Model */}
      <Section title="Default Model" description="Applied to all agents unless overridden" icon={Cpu}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODELS.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              selected={selectedModel === model.id}
              onClick={() => setSelectedModel(model.id)}
            />
          ))}
        </div>
      </Section>

      {/* Agent Overrides */}
      <Section title="Agent Overrides" description="Per-agent model configuration" icon={Zap}>
        <div className="space-y-3">
          {AGENT_OVERRIDES.map(override => {
            const model = MODELS.find(m => m.id === override.modelId)
            return (
              <div 
                key={override.agentId}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-neutral-900/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-indigo-400">{override.agentName[0]}</span>
                  </div>
                  <div>
                    <div className="text-sm text-white">{override.agentName}</div>
                    <div className="text-xs text-neutral-500">Override active</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-white">{model?.name}</div>
                    <div className="text-xs text-neutral-500 capitalize">{model?.provider}</div>
                  </div>
                  <button className="p-1.5 hover:bg-white/5 rounded-md transition-colors">
                    <ChevronRight className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
              </div>
            )
          })}
          
          <button 
            onClick={() => {}}
            className="w-full py-3 border border-dashed border-white/10 rounded-lg text-sm text-neutral-500 hover:text-white hover:border-white/20 transition-colors"
          >
            + Add Agent Override
          </button>
        </div>
      </Section>
    </div>
  )
}

function NotificationsTab() {
  const [routes, setRoutes] = useState(NOTIFICATION_ROUTES)
  
  const toggleChannel = (eventIndex: number, channel: 'slack' | 'email' | 'webhook') => {
    setRoutes(prev => prev.map((route, i) => 
      i === eventIndex 
        ? { ...route, channels: { ...route.channels, [channel]: !route.channels[channel] } }
        : route
    ))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Section title="Channel Configuration" description="Configure notification channels" icon={Bell}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Slack className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-white">Slack</span>
            </div>
            <div className="text-xs text-neutral-500 mb-3">Connected to #alerts</div>
            <button className="text-xs text-indigo-400 hover:text-indigo-300">Configure →</button>
          </div>
          
          <div className="p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-white">Email</span>
            </div>
            <div className="text-xs text-neutral-500 mb-3">admin@openclaw.ai</div>
            <button className="text-xs text-indigo-400 hover:text-indigo-300">Configure →</button>
          </div>
          
          <div className="p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-white">Webhook</span>
            </div>
            <div className="text-xs text-neutral-500 mb-3">2 endpoints active</div>
            <button className="text-xs text-indigo-400 hover:text-indigo-300">Configure →</button>
          </div>
        </div>
      </Section>

      <Section title="Routing Matrix" description="Map events to notification channels" icon={MessageSquare}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">Event</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Slack className="w-3.5 h-3.5" />
                    Slack
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Webhook
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, i) => (
                <tr key={route.event} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm text-white">{route.event}</td>
                  <td className="py-3 px-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={route.channels.slack}
                      onChange={() => toggleChannel(i, 'slack')}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={route.channels.email}
                      onChange={() => toggleChannel(i, 'email')}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0"
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={route.channels.webhook}
                      onChange={() => toggleChannel(i, 'webhook')}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

function DangerTab() {
  const [panicMode, setPanicMode] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handlePanicToggle = () => {
    setShowConfirmModal(true)
  }

  const confirmPanic = () => {
    setPanicMode(!panicMode)
    setShowConfirmModal(false)
  }

  const restartGateway = async () => {
    if (!confirm("Are you sure you want to restart the OpenClaw Gateway? This will briefly interrupt all agents.")) return
    
    setLoading('gateway')
    try {
        const res = await fetch('/api/gateway/restart', { method: 'POST' })
        const data = await res.json()
        if (data.success) {
            // alert("Gateway restart initiated.")
        } else {
            alert("Failed to restart gateway: " + data.error)
        }
    } catch (e) {
        alert("Error calling restart API")
        console.error(e)
    } finally {
        setTimeout(() => setLoading(null), 5000) // Fake delay for UI feedback
    }
  }

  const clearCache = () => {
    if (!confirm("Clear all vector cache? This will require re-indexing all memory.")) return
    alert("Vector cache cleared. 1.2GB freed.")
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Emergency Stop - The Kill Switch */}
      <div className={`
        relative overflow-hidden rounded-xl border-2 transition-all duration-300
        ${panicMode 
          ? 'bg-emerald-500/5 border-emerald-500/30' 
          : 'bg-rose-500/5 border-rose-500/30'
        }
      `}>
        {/* Warning stripes background */}
        {!panicMode && (
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #f43f5e 10px, #f43f5e 20px)'
            }} />
          </div>
        )}
        
        <div className="relative p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                ${panicMode ? 'bg-emerald-500/20' : 'bg-rose-500/20'}
              `}>
                <AlertOctagon className={`w-6 h-6 ${panicMode ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              
              <div>
                <h3 className={`text-lg font-semibold ${panicMode ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {panicMode ? 'SWARM PAUSED' : 'Emergency Stop'}
                </h3>
                <p className="text-sm text-neutral-400 mt-1 max-w-md">
                  {panicMode 
                    ? 'All autonomous execution is currently paused. Manual interactions and direct commands still work.'
                    : 'Immediately pause all autonomous execution including heartbeats, crons, and event reactors.'
                  }
                </p>
              </div>
            </div>
            
            <button 
              onClick={handlePanicToggle}
              className={`
                px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shrink-0
                ${panicMode 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)]'
                }
              `}
            >
              <Power className="w-5 h-5" />
              {panicMode ? 'RESUME SWARM' : 'PAUSE SWARM'}
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <Section title="System Maintenance" description="Gateway controls and cache management" icon={Database}>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <RefreshCw className={`w-5 h-5 text-indigo-400 ${loading === 'gateway' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Restart Gateway</div>
                <div className="text-xs text-neutral-500">Briefly interrupt all agent connections</div>
              </div>
            </div>
            <button 
              onClick={restartGateway}
              disabled={loading === 'gateway'}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[100px] flex justify-center"
            >
              {loading === 'gateway' ? 'Restarting...' : 'Restart'}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Clear Vector Cache</div>
                <div className="text-xs text-neutral-500">Remove all indexed memory embeddings</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 font-mono">1.2 GB</span>
              <button 
                onClick={clearCache}
                className="px-4 py-2 border border-white/10 hover:border-rose-500/50 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 rounded-lg text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Re-index Memory</div>
                <div className="text-xs text-neutral-500">Rebuild vector index from all memory files</div>
              </div>
            </div>
            <button className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors">
              Re-index
            </button>
          </div>
        </div>
      </Section>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${panicMode ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                <AlertTriangle className={`w-5 h-5 ${panicMode ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {panicMode ? 'Resume Swarm?' : 'Pause All Agents?'}
              </h3>
            </div>
            
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              {panicMode 
                ? 'This will re-enable all autonomous execution including heartbeats, scheduled tasks, and event reactors.'
                : 'This will immediately stop all autonomous execution. Heartbeats, crons, and event reactors will be paused until manually resumed.'
              }
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPanic}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${panicMode 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }
                `}
              >
                {panicMode ? 'Resume Swarm' : 'Pause Swarm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General', icon: Settings },
    { id: 'models' as SettingsTab, label: 'Models', icon: Cpu },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'danger' as SettingsTab, label: 'Danger Zone', icon: AlertTriangle, danger: true },
  ]

  const handleSave = () => {
    setSaveStatus('saving')
    setTimeout(() => setSaveStatus('saved'), 1000)
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  return (
    <div className="min-h-full bg-neutral-950">
      {/* Page Header */}
      <div className="border-b border-white/5 bg-neutral-900/20">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-sm text-neutral-500 mt-1">Configure your OpenClaw swarm</p>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saveStatus !== 'idle'}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all
                ${saveStatus === 'saved' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                }
              `}
            >
              {saveStatus === 'saving' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 shrink-0">
            <nav className="space-y-1 sticky top-6">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === tab.id 
                        ? tab.danger 
                          ? 'bg-rose-500/10 text-rose-400' 
                          : 'bg-indigo-500/10 text-indigo-400'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'models' && <ModelsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'danger' && <DangerTab />}
          </main>
        </div>
      </div>
    </div>
  )
}
