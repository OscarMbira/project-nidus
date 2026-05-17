import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticePlan } from '../../../services/sim/practicePlanService'
import { createPracticeStagePlan } from '../../../services/sim/practiceStageplanService'

export default function SimStagePlanCreate() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [practicePlanId, setPracticePlanId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    stage_number: 1,
    stage_title: '',
    stage_objectives: '',
    planned_start_date: '',
    planned_end_date: '',
    tolerance_time: '',
    tolerance_cost: '',
    tolerance_scope: '',
  })
  const base = `/simulator/practice-projects/${projectId}/plans`

  useEffect(() => {
    getPracticePlan(projectId).then((res) => {
      if (res.success && res.data?.id) setPracticePlanId(res.data.id)
    })
  }, [projectId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!practicePlanId) return
    try {
      setLoading(true)
      const result = await createPracticeStagePlan(projectId, Number(formData.stage_number), {
        practice_plan_id: practicePlanId,
        stage_title: formData.stage_title,
        stage_objectives: formData.stage_objectives,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        tolerance_time: formData.tolerance_time,
        tolerance_cost: formData.tolerance_cost,
        tolerance_scope: formData.tolerance_scope,
      })
      if (result.success) navigate(base)
      else alert(result.error || 'Failed to create stage plan')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!practicePlanId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">Create a project plan before adding stage plans.</p>
        <Link to={`${base}/project-plan/create`} className="text-blue-600 hover:underline">
          Create project plan
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={base} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to plans
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create stage plan</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Stage number *</label>
            <input
              type="number"
              min={1}
              required
              value={formData.stage_number}
              onChange={(e) => setFormData({ ...formData, stage_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stage title *</label>
            <input
              required
              value={formData.stage_title}
              onChange={(e) => setFormData({ ...formData, stage_title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Objectives</label>
          <textarea
            rows={3}
            value={formData.stage_objectives}
            onChange={(e) => setFormData({ ...formData, stage_objectives: e.target.value })}
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
