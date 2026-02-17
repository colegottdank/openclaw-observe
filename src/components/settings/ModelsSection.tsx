import { useState, useMemo } from 'react'
import { Bot, ChevronDown, X } from 'lucide-react'
import { useGatewayConfig } from '../../hooks'
import { LoadingState, ErrorState, ProviderIcon } from '../ui'
import { MODELS, DEFAULT_MODEL_ID, PROVIDER_COLORS, PROVIDER_BG } from '../../constants/models'
import type { AgentConfig } from '../../types'

export function ModelsSection() {
  const { data: config, loading, error, patchConfig, refetch } = useGatewayConfig()
  const [showModelPicker, setShowModelPicker] = useState<string | null>(null)

  const defaultModel = config?.agents?.defaults?.model || DEFAULT_MODEL_ID

  const agents = useMemo(() => {
    const list = config?.agents?.list || []
    return list.map((agent: AgentConfig) => ({
      id: agent.id,
      name: agent.name || agent.id,
      model: agent.model,
      enabled: agent.enabled !== false,
    }))
  }, [config])

  const handleDefaultModelSelect = async (modelId: string) => {
    try {
      await patchConfig({
        agents: {
          defaults: { model: modelId },
          list: config?.agents?.list || [],
        },
      })
    } catch (err) {
      console.error('Error updating default model:', err)
    }
  }

  const handleAgentOverride = async (agentId: string, modelId: string | null) => {
    setShowModelPicker(null)
    try {
      const updatedList = (config?.agents?.list || []).map((agent: AgentConfig) => {
        if (agent.id === agentId) {
          return { ...agent, model: modelId || undefined }
        }
        return agent
      })
      await patchConfig({ agents: { list: updatedList } })
    } catch (err) {
      console.error('Error updating agent override:', err)
    }
  }

  if (loading && !config) return <LoadingState message="Loading models..." />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div className="space-y-6">
      {/* Default Model Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden backdrop-blur-sm p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Default Model</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MODELS.map(model => {
            const isSelected = defaultModel === model.id
            return (
              <button
                key={model.id}
                onClick={() => handleDefaultModelSelect(model.id)}
                className={`relative p-4 rounded-xl border text-left transition-all duration-200 group ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : 'bg-neutral-950/30 border-white/[0.04] hover:border-white/[0.08] hover:bg-neutral-950/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 transition-all ${PROVIDER_BG[model.provider]} ${PROVIDER_COLORS[model.provider]}`}>
                  <ProviderIcon provider={model.provider} size={20} />
                </div>
                <div className="text-sm font-medium text-white">{model.name}</div>
                <div className="text-xs text-neutral-500 mt-0.5 font-mono">{model.id}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500">${model.costPer1K}/1K tokens</span>
                </div>
                {model.badge && (
                  <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {model.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Agent Overrides Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-white">Agent Model Overrides</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Per-agent model exceptions to the default</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {agents.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-500 text-sm">No agents configured</div>
          ) : (
            agents.map(agent => {
              const override = agent.model
              const overrideModel = override ? MODELS.find(m => m.id === override) : null
              const hasOverride = override && override !== defaultModel
              const isPickerOpen = showModelPicker === agent.id

              return (
                <div key={agent.id} className="relative">
                  <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-neutral-500" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                        <span className="text-[10px] font-mono text-neutral-600 ml-2">{agent.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {hasOverride ? (
                        <>
                          {overrideModel ? (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${PROVIDER_BG[overrideModel.provider]} ${PROVIDER_COLORS[overrideModel.provider]}`}>
                              <ProviderIcon provider={overrideModel.provider} size={12} />
                              {overrideModel.name}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-neutral-800/50 border-neutral-700 text-neutral-400">
                              <span className="font-mono">{override}</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleAgentOverride(agent.id, null)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Clear override"
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowModelPicker(isPickerOpen ? null : agent.id)}
                          className="px-3 py-1.5 text-xs text-neutral-400 border border-white/[0.06] rounded-lg hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
                        >
                          Set Override
                          <ChevronDown className={`w-3 h-3 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Model Picker */}
                  {isPickerOpen && (
                    <div className="px-6 pb-4 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-3 bg-neutral-950/50 rounded-xl border border-white/[0.04]">
                        {MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => handleAgentOverride(agent.id, model.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs hover:border-white/[0.12] hover:bg-neutral-800/30 transition-colors ${PROVIDER_COLORS[model.provider]} border-white/[0.04]`}
                          >
                            <ProviderIcon provider={model.provider} size={14} />
                            <span className="text-neutral-300">{model.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
