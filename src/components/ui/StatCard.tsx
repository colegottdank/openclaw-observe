interface StatCardProps {
  label: string
  value: string
  color?: string
}

export function StatCard({ label, value, color = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-lg">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  )
}
