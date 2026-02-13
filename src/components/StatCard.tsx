interface StatCardProps {
  label: string
  value: number
  trend?: string
  trendUp?: boolean
  icon: string
  iconColor: string
}

export function StatCard({ label, value, trend, trendUp, icon, iconColor }: StatCardProps) {
  return (
    <div className="card p-4 flex items-start justify-between">
      <div>
        <div className="text-label text-[var(--text-tertiary)] mb-2">{label}</div>
        <div className="flex items-baseline gap-2">
          <div className="stat-number text-[var(--text-primary)]">{value}</div>
          {trend && (
            <span 
              className={`text-caption font-medium ${
                trendUp ? 'text-[var(--success)]' : 'text-[var(--error)]'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        style={{ 
          backgroundColor: `${iconColor}20`,
          color: iconColor 
        }}
      >
        {icon}
      </div>
    </div>
  )
}
