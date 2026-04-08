/**
 * Practice Benefits Review Plan View (by id)
 * Loads a single plan by id and displays read-only (when opened from list without project context).
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeBenefitsReviewPlanById } from '../../services/sim/practiceBenefitsService'

export default function PracticeBenefitsReviewPlanViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      const result = await getPracticeBenefitsReviewPlanById(id)
      if (cancelled) return
      if (result.success && result.data) {
        setPlan(result.data)
      } else {
        setError(result.error || 'Plan not found')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }
  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600 dark:text-red-400">{error || 'Plan not found'}</p>
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
        onClick={() => navigate('/simulator/pmo/initiation/benefits-review-plan')}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.plan_title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Project: {plan.practice_projects?.project_name || '—'} · Version {plan.version_number || '1.0'} · Status: {plan.status || 'draft'}
        </p>
        {plan.scope_description && (
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Scope</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.scope_description}</p>
          </div>
        )}
        {plan.measurement_approach && (
          <div>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Measurement approach</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{plan.measurement_approach}</p>
          </div>
        )}
      </div>
    </div>
  )
}
