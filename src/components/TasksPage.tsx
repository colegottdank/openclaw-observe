import { TaskBoard } from './TaskBoard'

interface TasksPageProps {
  tasks: any[]
  agents: any[]
}

export function TasksPage({ tasks, agents }: TasksPageProps) {
  return (
    <div className="h-full w-full p-2 lg:p-6 overflow-hidden flex flex-col">
       <TaskBoard tasks={tasks} agents={agents} />
    </div>
  )
}
