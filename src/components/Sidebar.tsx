type View = 'overview' | 'project' | 'activity' | 'agents'

interface SidebarProps {
  projects: any[] | undefined
  agents: any[] | undefined
  currentView: View
  selectedProjectId: string | null
  onSelectView: (view: View) => void
  onSelectProject: (id: string) => void
}

export default function Sidebar({
  projects,
  agents,
  currentView,
  selectedProjectId,
  onSelectView,
  onSelectProject,
}: SidebarProps) {
  const activeAgents = agents?.filter(
    (a: any) => a.lastHeartbeat && Date.now() - a.lastHeartbeat < 3600000
  )

  return (
    <div
      className="w-60 h-screen flex flex-col shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-2xl">🥔</span>
        <div>
          <h1 className="text-sm font-bold leading-tight">Mission Control</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {activeAgents?.length || 0} agents online
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-auto py-3">
        <div className="px-3 mb-4">
          <NavItem
            icon="🏠"
            label="Overview"
            active={currentView === 'overview'}
            onClick={() => onSelectView('overview')}
          />
          <NavItem
            icon="⚡"
            label="Activity"
            active={currentView === 'activity'}
            onClick={() => onSelectView('activity')}
          />
          <NavItem
            icon="🤖"
            label="Agents"
            active={currentView === 'agents'}
            onClick={() => onSelectView('agents')}
          />
        </div>

        {/* Projects */}
        <div className="px-3">
          <p
            className="text-xs font-semibold uppercase tracking-wider px-2 mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Projects
          </p>
          {projects?.map((project: any) => (
            <NavItem
              key={project._id}
              icon={project.status === 'active' ? '🟢' : '⏸️'}
              label={project.name}
              active={currentView === 'project' && selectedProjectId === project._id}
              onClick={() => onSelectProject(project._id)}
            />
          ))}
          {(!projects || projects.length === 0) && (
            <p className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
              No projects yet
            </p>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3 text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        Powered by Spud 🥔
      </div>
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-all duration-150 cursor-pointer"
      style={{
        background: active ? 'var(--bg-tertiary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-hover)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}
