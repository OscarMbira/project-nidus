import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticePlan } from '../../../services/sim/practicePlanService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function SimProjectPlanView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const base = `/simulator/practice-projects/${projectId}/plans`

  useEffect(() => {
    if (projectId) loadPlan()
  }, [projectId])

  useEffect(() => {
    if (activeTab !== 'audit' || !plan) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [plan.created_by, plan.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [activeTab, plan])

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

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this Project Plan.">
          <AuditCard title="Identity" description="How this plan is labelled.">
            <AuditField label="Title" value={plan.plan_title} />
            <AuditField label="Reference" value={plan.plan_reference} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this plan sits.">
            <AuditField label="Status" value={humanizeAuditToken(plan.status)} />
            <AuditField label="Baseline" value={plan.is_baseline ? 'Yes' : 'No'} />
          </AuditCard>
          <AuditCard title="Record history" description="When this plan was created and last changed.">
            <AuditField label="Created by" value={plan.created_by ? auditUserLabels[plan.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={plan.created_at} />
            <AuditField label="Updated by" value={plan.updated_by ? auditUserLabels[plan.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={plan.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
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
      )}
    </div>
  )
}
