import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
export default function SimProjectBudgetBaseline() {
  const { projectId } = useParams()
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to={`/simulator/practice-projects/${projectId}`} className="inline-flex items-center gap-2 text-sm text-blue-400">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-xl font-bold">Practice budget baseline</h1>
        <p className="text-sm text-gray-400">Use <code className="text-xs">sim.project_budget_baselines</code> via PMO tools; full UI parity with Platform ProjectBudgetBaseline can extend this page.</p>
      </div>
    </div>
  )
}
