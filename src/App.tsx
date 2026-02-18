import { useState, useEffect } from 'react'
import { Link, Route, Switch, useLocation } from 'wouter'
import {
	LayoutDashboard,
	Users,
	Menu,
	X,
	Clock,
	ScrollText,
	Terminal,
	ChevronsLeft,
} from 'lucide-react'

// Components
import { AgentDetail } from './components/AgentDetail'
import { Layout } from './components/Layout'
import { Overview } from './components/Overview'
import { AgentsList } from './components/AgentsList'
import { LogsPage } from './components/LogsPage'
import { NotFound } from './components/NotFound'
import { TimelinePage } from './components/TimelinePage'
import { SessionsPage } from './components/SessionsPage'
import { useAgents, useGatewayStatus } from './hooks'
import { ErrorBoundary } from './components/ui'

const NAV_ITEMS = [
	{ label: 'Overview', path: '/', icon: LayoutDashboard },
	{ label: 'Timeline', path: '/timeline', icon: Clock },
	{ label: 'Sessions', path: '/sessions', icon: ScrollText },
	{ label: 'Agents', path: '/agents', icon: Users },
	{ label: 'Logs', path: '/logs', icon: Terminal },
]

export default function App() {
	const [location, setLocation] = useLocation()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [collapsed, setCollapsed] = useState(() => localStorage.getItem('oc-sidebar-collapsed') === 'true')
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	const toggleCollapsed = () => {
		setCollapsed(prev => {
			localStorage.setItem('oc-sidebar-collapsed', String(!prev))
			return !prev
		})
	}

	// Only needed for agent detail route lookup
	const { data: agents } = useAgents()
	const { data: gatewayStatus } = useGatewayStatus()
	const isOnline = gatewayStatus?.status === 'online'
	const statusLabel = gatewayStatus ? (isOnline ? 'Operational' : 'Offline') : 'Checking...'
	const statusColor = gatewayStatus ? (isOnline ? 'bg-emerald-500' : 'bg-red-500') : 'bg-neutral-500'
	const statusTextColor = gatewayStatus ? (isOnline ? 'text-emerald-500' : 'text-red-500') : 'text-neutral-500'

	return (
		<div className="flex h-[100dvh] bg-neutral-950 text-neutral-300 font-sans selection:bg-indigo-500/30 overflow-hidden">

			{/* MOBILE OVERLAY */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-200"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* SIDEBAR */}
			<aside
				className={`
					fixed inset-y-0 left-0 z-50 bg-neutral-900 border-r border-neutral-800
					flex flex-col transition-all duration-300 ease-out
					lg:static lg:translate-x-0
					${collapsed && mounted ? 'lg:w-[72px]' : 'lg:w-60'}
					${sidebarOpen ? 'translate-x-0 w-60' : '-translate-x-full w-60'}
				`}
			>
				{/* Header */}
				<div className="h-14 flex items-center shrink-0 border-b border-neutral-800 px-3">
					<Link href="/" className="flex items-center gap-3 overflow-hidden flex-1">
						<img
							src="/logo.svg"
							alt="Reef"
							className="w-8 h-8 shrink-0"
						/>
						<span className={`
							font-semibold text-neutral-100 text-sm whitespace-nowrap
							transition-all duration-300 ease-out
							${collapsed && mounted ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}
						`}>
							Reef
						</span>
					</Link>

					{/* Collapse toggle - desktop only */}
					<button
						onClick={toggleCollapsed}
						className={`
							hidden lg:flex items-center justify-center w-7 h-7 rounded-md
							text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800
							transition-all duration-200 cursor-pointer
						`}
						title={collapsed ? 'Expand' : 'Collapse'}
					>
						<div className={`
							transition-transform duration-300
							${collapsed ? 'rotate-180' : ''}
						`}>
							<ChevronsLeft className="w-4 h-4" />
						</div>
					</button>

					<button
						onClick={() => setSidebarOpen(false)}
						className="lg:hidden text-neutral-500 hover:text-white p-1.5 rounded-md hover:bg-neutral-800 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Nav */}
				<nav className="flex-1 overflow-y-auto py-4 px-2">
					<ul className="space-y-1">
						{NAV_ITEMS.map(item => {
							const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path))
							const Icon = item.icon
							return (
								<li key={item.label}>
									<Link
										href={item.path}
										onClick={() => setSidebarOpen(false)}
										className={`
											group flex items-center gap-3 rounded-md text-sm font-medium
											transition-colors duration-150 h-10
											${collapsed && mounted ? 'lg:justify-center lg:px-0' : 'px-3'}
											${isActive
												? 'bg-neutral-800 text-white'
												: 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
											}
										`}
									>
										<div className={`
											flex items-center justify-center shrink-0
											${collapsed && mounted ? 'w-10' : 'w-5'}
										`}>
											<Icon
												className={`
													shrink-0 transition-transform duration-150
													${isActive ? 'text-indigo-400' : 'text-neutral-500 group-hover:text-neutral-300'}
												`}
												size={collapsed && mounted ? 20 : 18}
											/>
										</div>

										<span className={`
											whitespace-nowrap transition-all duration-300 ease-out
											${collapsed && mounted ? 'lg:opacity-0 lg:w-0 lg:hidden' : 'opacity-100'}
										`}>
											{item.label}
										</span>
									</Link>
								</li>
							)
						})}
					</ul>
				</nav>

				{/* Footer */}
				<div className="border-t border-neutral-800 shrink-0 p-3">
					<div className={`flex items-center gap-2 ${collapsed && mounted ? 'lg:justify-center' : ''}`}>
						<span className={`w-2 h-2 rounded-full shrink-0 ${statusColor} ${isOnline ? 'animate-pulse' : ''}`} />
						<span className={`
							text-xs font-medium ${statusTextColor} whitespace-nowrap
							transition-all duration-300 ease-out
							${collapsed && mounted ? 'lg:opacity-0 lg:w-0 lg:hidden' : 'opacity-100'}
						`}>
							{statusLabel}
						</span>
					</div>
				</div>
			</aside>

			{/* MAIN CONTENT */}
			<div className="flex-1 flex flex-col min-w-0 bg-neutral-950">

				{/* MOBILE HEADER */}
				<div className="lg:hidden h-14 border-b border-neutral-800/60 flex items-center px-4 bg-neutral-900/50 backdrop-blur shrink-0 justify-between">
					<div className="flex items-center gap-3">
						<button
							onClick={() => setSidebarOpen(true)}
							className="text-neutral-400 hover:text-white p-1.5 -ml-1.5 rounded-md hover:bg-neutral-800/50 transition-colors"
						>
							<Menu className="w-5 h-5" />
						</button>
						<span className="font-bold text-neutral-100">Reef</span>
					</div>
					<span className={`w-2 h-2 rounded-full ${statusColor} ${isOnline ? 'animate-pulse' : ''}`} title={statusLabel} />
				</div>

				<ErrorBoundary key={location}>
				<Switch>
					<Route path="/agents/:id">
						{(params: { id: string }) => {
							const agent = agents?.find(a => a.id === params.id)
							if (!agents) return <div className="flex-1 flex items-center justify-center text-neutral-500">Loading...</div>
							if (!agent) return <div className="p-6">Agent not found</div>
							return <AgentDetail agent={agent} onBack={() => setLocation('/agents')} />
						}}
					</Route>

					<Route path="/">
						<Layout><Overview /></Layout>
					</Route>

					<Route path="/timeline">
						<Layout><TimelinePage /></Layout>
					</Route>

					<Route path="/sessions">
						<Layout><SessionsPage /></Layout>
					</Route>

					<Route path="/agents">
						<Layout><AgentsList /></Layout>
					</Route>

					<Route path="/logs">
						<Layout><LogsPage /></Layout>
					</Route>

					<Route path="/:rest*">
						<Layout><NotFound /></Layout>
					</Route>
				</Switch>
				</ErrorBoundary>
			</div>
		</div>
	)
}
