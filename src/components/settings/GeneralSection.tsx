import { useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  X,
  RefreshCw,
  Bot,
  Activity,
  HardDrive,
} from 'lucide-react'
import { useGatewayConfig, useGatewayStatus } from '../../hooks'
import { LoadingState, ErrorState, StatusBadge } from '../ui'
import { formatLastActive } from '../../utils/time'
import type { Agent, AgentConfig, GatewayConfig, GatewayStatus as GatewayStatusType } from '../../types'

type AgentUI = {
  id: string
  name: string
  status: 'active' | 'paused' | 'error'
  model: string
  lastActive: string
  enabled: boolean
}

function transformAgents(config: GatewayConfig): AgentUI[] {
  const agentList = config?.agents?.list || []
  const defaultModel = config?.agents?.defaults?.model || 'default'
  return agentList.map((agent: AgentConfig) => ({
    id: agent.id,
    name: agent.name || agent.id,
    status: agent.enabled === false ? 'paused' as const : 'active' as const,
    model: agent.model || defaultModel,
    lastActive: agent.lastActive || 'Unknown',
    enabled: agent.enabled !== false,
  }))
}

export function GeneralSection() {
  const { data: config, loading: configLoading, error: configError, patchConfig, refetch: refetchConfig } = useGatewayConfig()
  const { data: gatewayStatus, loading: statusLoading, error: statusError } = useGatewayStatus()
  const [restartConfirm, setRestartConfirm] = useState(false)
  const [pauseConfirmAgentId, setPauseConfirmAgentId] = useState<string | null>(null)

  const agents = config ? transformAgents(config) : []
  const status = gatewayStatus || { status: 'offline' as const }

  const toggleAgent = async (id: string) => {
    const agent = agents.find(a => a.id === id)
    if (!agent) return

    const updatedList = (config?.agents?.list || []).map((a: AgentConfig) =>
      a.id === id ? { ...a, enabled: agent.enabled ? false : true } : a
    )

    try {
      await patchConfig({ agents: { list: updatedList } })
    } catch (err) {
      console.error('Error toggling agent:', err)
    }
  }

  const handleRestart = async () => {
    try {
      await fetch('/api/gateway/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => null)
      setRestartConfirm(false)
    } catch (err) {
      console.error('Error restarting gateway:', err)
    }
  }

  if (configLoading && !config) return <LoadingState message="Loading settings..." />
  if (configError) return <ErrorState error={configError} onRetry={refetchConfig} />

  return (
    <div className="space-y-6">
      {/* Gateway Controls Card */}
      <div className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden backdrop-blur-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                status.status === 'online'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-amber-500/10 border border-amber-500/20 animate-pulse'
              }`}>
                {status.status === 'online' ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-white">Gateway</span>
                  <StatusBadge status={status.status} />
                </div>
                <div className="text-xs text-neutral-500 font-mono mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">{status.version || 'v?.?.?'}</span>
                  <span className="text-neutral-700">•</span>
                  <span>pid {status.pid || '?'}</span>
                  <span className="text-neutral-700">•</span>
                  <span>port {status.port || '?'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!restartConfirm ? (
                <button
                  onClick={() => setRestartConfirm(true)}
                  disabled={status.status === 'restarting'}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Restart
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleRestart} className="px-4 py-2 text-xs font-medium rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Confirm
                  </button>
                  <button onClick={() => setRestartConfirm(false)} className="px-3 py-2 text-xs rounded-xl border border-white/[0.06] text-neutral-500 hover:text-white hover:bg-white/[0.04] transition-all">
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gateway Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Uptime', value: status.uptime || '-', icon: Activity },
              { label: 'Memory Usage', value: status.memoryUsage || '-', icon: HardDrive },
              ...(status.version ? [{ label: 'Version', value: status.version, icon: Bot }] : []),
            ].map(metric => (
              <div key={metric.label} className="p-4 rounded-xl bg-neutral-950/50 border border-white/[0.04]">
                <div className="flex items-center gap-2 text-neutral-500 mb-2">
                  <metric.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase tracking-wider font-bold">{metric.label}</span>
                </div>
                <div className="text-sm font-mono text-neutral-300">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Data Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-white/[0.04] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Registered Agents</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Manage individual agent states</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {agents.filter(a => a.enabled).length} Active
            <span className="w-2 h-2 rounded-full bg-amber-500 ml-2" />
            {agents.filter(a => !a.enabled).length} Paused
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.04] bg-neutral-950/30">
                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">Name</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">ID</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">Status</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">Model</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">Last Active</th>
                <th className="text-right px-6 py-3 text-[10px] uppercase tracking-wider font-bold text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 text-sm">No agents configured</td>
                </tr>
              ) : (
                agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                          agent.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/10' :
                          agent.status === 'paused' ? 'bg-amber-500/5 border-amber-500/10' :
                          'bg-rose-500/5 border-rose-500/10'
                        }`}>
                          <Bot className={`w-4 h-4 ${
                            agent.status === 'active' ? 'text-emerald-500' :
                            agent.status === 'paused' ? 'text-amber-500' :
                            'text-rose-500'
                          }`} strokeWidth={1.5} />
                        </div>
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-[11px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded">{agent.id}</code>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-neutral-400 font-mono">{agent.model}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-neutral-500">{formatLastActive(agent.lastActive)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {pauseConfirmAgentId === agent.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-amber-400">Pause?</span>
                          <button
                            onClick={() => { toggleAgent(agent.id); setPauseConfirmAgentId(null) }}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <Pause className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => setPauseConfirmAgentId(null)}
                            className="p-1.5 rounded-lg border border-white/[0.06] text-neutral-500 hover:text-white hover:bg-white/[0.04] transition-colors"
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (agent.status === 'active') setPauseConfirmAgentId(agent.id)
                            else toggleAgent(agent.id)
                          }}
                          className={`p-2 rounded-lg border transition-all ${
                            agent.status === 'active'
                              ? 'border-white/[0.06] text-neutral-500 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/5'
                              : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                          }`}
                          title={agent.status === 'active' ? 'Pause agent' : 'Resume agent'}
                        >
                          {agent.status === 'active' ? (
                            <Pause className="w-4 h-4" strokeWidth={1.5} />
                          ) : (
                            <Play className="w-4 h-4" strokeWidth={1.5} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
