/**
 * Practice Benefits Review Plan View (by id)
 * Loads a single plan by id and displays read-only (when opened from list without project context).
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeBenefitsReviewPlanById } from '../../services/sim/practiceBenefitsService'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

export default function PracticeBenefitsReviewPlanViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details') // v1344 slice 6: Details + Audit details

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
          onClick={() => navigate(-1)}
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
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{plan.plan_title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Project: {plan.practice_projects?.project_name || '—'} · Version {plan.version_number || '1.0'} · Status: {plan.status || 'draft'}
        </p>
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Benefits review plan sections" />
        {activeTab === 'audit' ? (
          <AuditDetailsPanel description="Who created or changed this benefits review plan.">
            <AuditCard title="Identity" description="How this plan is labelled.">
              <AuditField label="Title" value={plan.plan_title} />
              <AuditField label="Version" value={plan.version_number} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this plan sits.">
              <AuditField label="Status" value={humanizeAuditToken(plan.status)} />
              <AuditField label="Practice project" value={plan.practice_projects?.project_name || null} />
            </AuditCard>
            <AuditCard title="Record history" description="When this plan was created and last changed.">
              <AuditTimestampPair dateLabel="Created at" value={plan.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={plan.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : (
          [
            ['Scope', plan.scope_description],
            ['Accountability', plan.accountability_description],
            ['Measurement approach', plan.measurement_approach],
            ['Measurement timing', plan.measurement_timing_rationale],
            ['Resources', plan.resources_description],
            ['Baseline measures', plan.baseline_measures_description],
            ['Performance reviews', [plan.performance_review_approach, plan.performance_review_frequency].filter(Boolean).join(' — ')],
            ['Dis-benefits', plan.dis_benefits_description],
          ].filter(([, v]) => v && String(v).trim()).map(([title, value]) => (
            <div key={title}>
              <h3 className="font-medium mb-2 text-gray-900 dark:text-white">{title}</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{value}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
