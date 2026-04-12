import { Link, useParams } from 'react-router-dom'

/**
 * Kanban boards for practice scenarios use platform `kanban_boards` (project-scoped).
 * Open Kanban metrics from a platform project, or extend schema to link practice ↔ platform.
 */
export default function SimKanbanMetrics() {
  const { projectId } = useParams()
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-2">Kanban metrics (simulator)</h1>
      <p className="text-gray-400 text-sm max-w-xl">
        Advanced Kanban analytics (CFD, lead/cycle, throughput, flow efficiency) are available on the platform Kanban metrics page for projects with Kanban boards. Simulator practice projects use the same metrics components when a board exists under a platform project.
      </p>
    </div>
  )
}
