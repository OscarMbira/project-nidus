import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticePlan } from '../../../services/sim/practicePlanService'

export default function SimProjectPlanCreate() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    plan_title: '',
    plan_purpose: '',
    plan_scope: '',
    planned_start_date: '',
    planned_end_date: '',
  })
  const base = `/simulator/practice-projects/${projectId}/plans`

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticePlan(projectId, formData)
      if (result.success) {
        navigate(`${base}/project-plan`)
      } else {
        alert(result.error || 'Failed to create plan')
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={base} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to plans
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create project plan</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            required
            value={formData.plan_title}
            onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purpose *</label>
          <textarea
            required
            rows={4}
            value={formData.plan_purpose}
            onChange={(e) => setFormData({ ...formData, plan_purpose: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(base)} className="px-4 py-2 border rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
