/**
 * Practice Benefits Review Plan Edit (by id)
 * Loads plan by id and shows edit form.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getPracticeBenefitsReviewPlanById,
  updatePracticeBenefitsReviewPlan,
} from '../../services/sim/practiceBenefitsService'

export default function PracticeBenefitsReviewPlanEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    plan_title: '',
    scope_description: '',
    measurement_approach: '',
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const result = await getPracticeBenefitsReviewPlanById(id)
      if (cancelled) return
      if (result.success && result.data) {
        setPlan(result.data)
        setFormData({
          plan_title: result.data.plan_title || '',
          scope_description: result.data.scope_description || '',
          measurement_approach: result.data.measurement_approach || '',
        })
      } else {
        setError(result.error || 'Plan not found')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!plan) return
    setSaving(true)
    setError(null)
    try {
      const result = await updatePracticeBenefitsReviewPlan(plan.id, formData)
      if (result.success) {
        navigate(`/simulator/practice-benefits-review-plans/${plan.id}`)
      } else {
        setError(result.error || 'Update failed')
      }
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }
  if (error && !plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => navigate('/simulator/pmo/initiation/benefits-review-plan')}
          className="mt-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(plan ? `/simulator/practice-benefits-review-plans/${plan.id}` : '/simulator/pmo/initiation/benefits-review-plan')}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Benefits Review Plan</h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Plan Title *</label>
          <input
            type="text"
            required
            value={formData.plan_title}
            onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Scope Description</label>
          <textarea
            value={formData.scope_description}
            onChange={(e) => setFormData({ ...formData, scope_description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Measurement Approach</label>
          <textarea
            value={formData.measurement_approach}
            onChange={(e) => setFormData({ ...formData, measurement_approach: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/simulator/practice-benefits-review-plans/${plan.id}`)}
            className="px-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
