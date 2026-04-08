/**
 * Practice Plan Documentation List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus, Edit } from 'lucide-react'
import { getPracticePlan, createPracticePlan, updatePracticePlan } from '../../services/sim/practicePlanService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_PLAN_COLUMNS = [
  { key: 'plan_title', label: 'Title' },
  { key: 'plan_purpose', label: 'Purpose' }
]

export default function PracticePlanList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    plan_title: '',
    plan_purpose: '',
    plan_scope: '',
    planned_start_date: '',
    planned_end_date: ''
  })

  useEffect(() => {
    if (projectId) loadPlan()
  }, [projectId])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getPracticePlan(projectId)
      if (result.success) {
        setPlan(result.data)
        if (result.data) setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (plan) {
        result = await updatePracticePlan(plan.id, formData)
      } else {
        result = await createPracticePlan(projectId, formData)
      }
      if (result.success) {
        setPlan(result.data)
        setEditing(false)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving plan:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Plan Documentation</h1>
        <div className="flex gap-2">
          {plan && <ExportListMenu columns={PRACTICE_PLAN_COLUMNS} data={[plan]} baseFilename="PracticePlan" />}
          {plan && !editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
          )}
        </div>
      </div>

      {!plan && !editing ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">No plan documentation found</p>
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> Create Plan
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Plan Title *</label>
            <input type="text" required value={formData.plan_title} onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Plan Purpose *</label>
            <textarea required value={formData.plan_purpose} onChange={(e) => setFormData({ ...formData, plan_purpose: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => { setEditing(false); if (plan) setFormData(plan) }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Plan Title</h3>
            <p className="text-gray-600 dark:text-gray-400">{plan.plan_title}</p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Plan Purpose</h3>
            <p className="text-gray-600 dark:text-gray-400">{plan.plan_purpose || 'N/A'}</p>
          </div>
          <button onClick={() => navigate(`/simulator/practice-plans/${plan.id}?projectId=${projectId}`)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Full Plan
          </button>
        </div>
      )}
    </div>
  )
}
