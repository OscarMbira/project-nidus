import { Link, useParams } from 'react-router-dom'

/** Practice projects do not yet persist sprint history in sim schema; surface link to methodology docs. */
export default function SimSprintMetricsDashboard() {
  const { projectId } = useParams()
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-400">
        ← Practice project
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-2">Sprint metrics (simulator)</h1>
      <p className="text-gray-400 text-sm max-w-lg">
        Sprint velocity and history for practice scenarios are tracked on the platform project. Use the platform Scrum metrics page when working with a linked live project, or extend sim schema with practice sprint tables in a future migration.
      </p>
    </div>
  )
}
