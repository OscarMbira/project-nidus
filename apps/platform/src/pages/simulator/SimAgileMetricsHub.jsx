import { Link, useParams } from 'react-router-dom'

export default function SimAgileMetricsHub() {
  const { projectId } = useParams()
  const base = `/simulator/practice-projects/${projectId}`
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <Link to={base} className="text-sm text-blue-400">
        ← Back
      </Link>
      <h1 className="text-xl font-bold mt-4 mb-4">Agile metrics hub (sim)</h1>
      <ul className="space-y-2 text-blue-400">
        <li>
          <Link to={`${base}/scrum/metrics`}>Sprint metrics</Link>
        </li>
        <li>
          <Link to={`${base}/xp/dashboard`}>XP</Link>
        </li>
        <li>
          <Link to={`${base}/lean/metrics`}>Lean</Link>
        </li>
      </ul>
    </div>
  )
}
