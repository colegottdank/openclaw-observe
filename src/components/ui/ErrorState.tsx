import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  error: string
  onRetry?: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm">{error}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
