export type ModelProvider = 'anthropic' | 'google' | 'openai'

export interface ModelInfo {
  id: string
  name: string
  provider: ModelProvider
  badge?: string
  costPer1K: number
}

export const MODELS: ModelInfo[] = [
  { id: 'anthropic/claude-opus-4-5-20250929', name: 'Claude Opus 4.5', provider: 'anthropic', badge: 'Default', costPer1K: 0.015 },
  { id: 'google-vertex/gemini-3-pro-preview', name: 'Gemini 3.0 Pro', provider: 'google', costPer1K: 0.00125 },
  { id: 'kimi-coding/k2p5', name: 'Kimi k2.5', provider: 'openai', costPer1K: 0.003 },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', costPer1K: 0.00125 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', costPer1K: 0.0003 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', costPer1K: 0.005 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', costPer1K: 0.0006 },
]

export const DEFAULT_MODEL_ID = 'anthropic/claude-opus-4-5-20250929'

export const PROVIDER_COLORS: Record<ModelProvider, string> = {
  anthropic: 'text-orange-400',
  google: 'text-blue-400',
  openai: 'text-emerald-400',
}

export const PROVIDER_BG: Record<ModelProvider, string> = {
  anthropic: 'bg-orange-500/10 border-orange-500/20',
  google: 'bg-blue-500/10 border-blue-500/20',
  openai: 'bg-emerald-500/10 border-emerald-500/20',
}
