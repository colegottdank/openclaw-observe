import { RefreshCw } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-neutral-900/50 to-neutral-900/30 p-12 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500">
          <RefreshCw className="w-5 h-5 animate-spin" strokeWidth={1.5} />
          <span className="text-sm">{message}</span>
        </div>
      </div>
    </div>
  )
}
