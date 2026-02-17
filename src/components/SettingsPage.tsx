import { useState } from 'react'
import { Settings, Sparkles } from 'lucide-react'
import { GeneralSection } from './settings/GeneralSection'
import { ModelsSection } from './settings/ModelsSection'
import { useGatewayStatus } from '../hooks'

type TabKey = 'general' | 'models'

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'models', label: 'Models', icon: Sparkles },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general')
  const { data: gatewayStatus } = useGatewayStatus()

  return (
    <div className="flex flex-col lg:flex-row h-full">
        {/* Sidebar Sub-Nav */}
        <nav className="w-full lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] bg-neutral-950/50 backdrop-blur-sm">
          <div className="p-4 lg:p-6">
            <h2 className="text-lg font-bold text-white mb-1 hidden lg:block">Settings</h2>
            <p className="text-xs text-neutral-500 mb-6 hidden lg:block">Configure your OpenClaw swarm</p>

            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hidden lg:block p-6 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold mb-2">Gateway</div>
            <div className="text-xs text-neutral-500 font-mono">{gatewayStatus?.version || '—'}</div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-5xl">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white">
                {TABS.find(t => t.key === activeTab)?.label}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {activeTab === 'general' && 'Manage gateway and agent configurations.'}
                {activeTab === 'models' && 'Configure default and per-agent model assignments with cost tracking.'}
              </p>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'general' && <GeneralSection />}
              {activeTab === 'models' && <ModelsSection />}
            </div>
          </div>
        </div>
      </div>
  )
}
