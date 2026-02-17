export const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  active: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  busy: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  online: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400' },
  idle: { dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  paused: { dot: 'bg-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' },
  offline: { dot: 'bg-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20', text: 'text-neutral-400' },
  blocked: { dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  error: { dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  aborted: { dot: 'bg-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400' },
  completed: { dot: 'bg-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20', text: 'text-neutral-400' },
}

const DEFAULT_STYLE = { dot: 'bg-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20', text: 'text-neutral-400' }

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}

/**
 * Just the colored dot, no text.
 */
export function StatusDot({ status, pulse = false, className = '' }: { status: string; pulse?: boolean; className?: string }) {
  const style = STATUS_STYLES[status] || DEFAULT_STYLE
  return (
    <span className={`w-2 h-2 rounded-full ${style.dot} ${pulse ? 'animate-pulse' : ''} ${className}`} />
  )
}
