import { Link } from 'wouter'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-3">
      <span className="text-lg font-medium text-neutral-400">404 — Page not found</span>
      <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
        Back to Overview
      </Link>
    </div>
  )
}
