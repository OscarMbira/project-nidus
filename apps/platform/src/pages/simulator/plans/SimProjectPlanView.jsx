import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticePlan } from '../../../services/sim/practicePlanService'

export default function SimProjectPlanView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const base = `/simulator/practice-projects/${projectId}/plans`

  useEffect(() => {
    if (projectId) loadPlan()
  }, [projectId])

  const loadPlan = async () => {
    setLoading(true)
    const result = await getPracticePlan(projectId)
    if (result.success && result.data) {
      setPlan(result.data)
    } else {
      navigate(`${base}/project-plan/create`, { replace: true })
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>
  }

  if (!plan) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={base} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to plans
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.plan_title}</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{plan.status || 'draft'}</p>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {plan.plan_purpose && (
          <div>
            <h2 className="text-sm font-medium text-gray-500">Purpose</h2>
            <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{plan.plan_purpose}</p>
          </div>
        )}
        {plan.plan_scope && (
          <div>
            <h2 className="text-sm font-medium text-gray-500">Scope</h2>
            <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{plan.plan_scope}</p>
          </div>
        )}
        {(plan.planned_start_date || plan.planned_end_date) && (
          <div>
            <h2 className="text-sm font-medium text-gray-500">Dates</h2>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {plan.planned_start_date || '—'} → {plan.planned_end_date || '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
