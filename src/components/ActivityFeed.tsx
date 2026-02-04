import { ActivityItem } from '../App'

interface ActivityFeedProps {
  activities: any[] | undefined
  agents: any[] | undefined
}

export default function ActivityFeed({ activities, agents }: ActivityFeedProps) {
  // Group activities by day
  const grouped = groupByDay(activities || [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Activity</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
        Everything happening across all swarms
      </p>

      {Object.entries(grouped).map(([day, items]) => (
        <div key={day} className="mb-6">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            {day}
          </h3>
          <div className="space-y-2">
            {(items as any[]).map((activity: any) => (
              <ActivityItem key={activity._id} activity={activity} agents={agents} />
            ))}
          </div>
        </div>
      ))}

      {(!activities || activities.length === 0) && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          No activity yet. Once your swarm starts working, you'll see everything here.
        </div>
      )}
    </div>
  )
}

function groupByDay(activities: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()

  for (const activity of activities) {
    const date = new Date(activity.createdAt)
    const dateStr = date.toDateString()
    let label: string

    if (dateStr === today) {
      label = 'Today'
    } else if (dateStr === yesterday) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    }

    if (!groups[label]) groups[label] = []
    groups[label].push(activity)
  }

  return groups
}
