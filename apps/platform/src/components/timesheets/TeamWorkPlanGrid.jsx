import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import {
  listProjectWorkPlansForPeriod,
  approveWorkPlan,
  rejectWorkPlan,
  userCanManageWorkPlanApprovals,
} from '../../services/projectWorkPlanService'
import { resolveTimesheetSettings } from '../../services/timesheetSettingsService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import WorkPlanReviewPanel from './WorkPlanReviewPanel'

const STATUS_BADGE_CLASSES = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.draft}`}>
      {status}
    </span>
  )
}

function toDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function mondayOf(d) { const c = new Date(d); c.setDate(c.getDate() - ((c.getDay() + 6) % 7)); return toDateOnly(c) }
function isoDate(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}` }

/**
 * Read + approve/reject consolidated Work Plan view for PM/PMO/Team Lead/Team Manager (v1180) —
 * every team member's plan for the period, stacked, mirroring TeamWeeklyTimesheetGrid.jsx's
 * self-contained period navigation (its own state, not shared with the individual Work Plan
 * tab). RLS (auth_user_can_manage_work_plans) is the real enforcement; the client-side
 * userCanManageWorkPlanApprovals check here only controls whether the review UI renders.
 */
export default function TeamWorkPlanGrid({ projectId }) {
  const [periodType, setPeriodType] = useState('weekly')
  const [periodAnchor, setPeriodAnchor] = useState(() => mondayOf(new Date()))
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [memberNames, setMemberNames] = useState({})
  const [canApprove, setCanApprove] = useState(false)
  const [reviewingPlan, setReviewingPlan] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!projectId || projectId === 'null') return
    getCurrentUserAccountId().then((accountId) => {
      if (!accountId) return
      resolveTimesheetSettings(accountId, projectId).then((s) => setPeriodType(s.work_plan_period_type || 'weekly'))
      userCanManageWorkPlanApprovals(projectId, accountId).then(setCanApprove)
    })
  }, [projectId])

  const periodStart = useMemo(() => {
    if (periodType === 'monthly') return isoDate(new Date(periodAnchor.getFullYear(), periodAnchor.getMonth(), 1))
    return isoDate(periodAnchor)
  }, [periodType, periodAnchor])

  const periodEnd = useMemo(() => {
    if (periodType === 'monthly') return isoDate(new Date(periodAnchor.getFullYear(), periodAnchor.getMonth() + 1, 0))
    const d = new Date(periodAnchor)
    d.setDate(d.getDate() + 6)
    return isoDate(d)
  }, [periodType, periodAnchor])

  const periodLabel = periodType === 'monthly'
    ? new Date(`${periodStart}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : `${new Date(`${periodStart}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${periodEnd}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  const load = async () => {
    if (!projectId || projectId === 'null') return
    setLoading(true)
    try {
      const rows = await listProjectWorkPlansForPeriod(projectId, periodStart)
      setPlans(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, periodStart])

  const userIds = useMemo(() => [...new Set(plans.map((p) => p.user_id).filter(Boolean))], [plans])

  useEffect(() => {
    if (userIds.length === 0) return
    platformDb.from('users').select('auth_user_id, full_name, email').in('auth_user_id', userIds)
      .then(({ data }) => setMemberNames(Object.fromEntries((data || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown member']))))
      .catch(() => {})
  }, [userIds])

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (memberNames[a.user_id] || '').localeCompare(memberNames[b.user_id] || '')),
    [plans, memberNames]
  )

  const handleStep = (dir) => {
    setPeriodAnchor((d) => {
      const n = new Date(d)
      if (periodType === 'monthly') n.setMonth(n.getMonth() + dir)
      else n.setDate(n.getDate() + dir * 7)
      return n
    })
  }

  const handleConfirmDecision = async (decision, notes) => {
    setProcessing(true)
    try {
      const { data: auth } = await platformDb.auth.getUser()
      const reviewerId = auth?.user?.id
      if (decision === 'approved') await approveWorkPlan(reviewingPlan.id, reviewerId, notes)
      else await rejectWorkPlan(reviewingPlan.id, reviewerId, notes)
      setReviewingPlan(null)
      await load()
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => handleStep(-1)}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[180px] text-center">{periodLabel}</span>
        <button type="button" onClick={() => handleStep(1)}
          className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setPeriodAnchor(mondayOf(new Date()))}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1">This period</button>
      </div>

      {sortedPlans.length === 0 && (
        <div className="text-center py-16 text-gray-500 dark:text-slate-500">No work plans submitted by the team this period.</div>
      )}

      {sortedPlans.map((plan) => {
        const total = plan.items.reduce((s, i) => s + (parseFloat(i.estimated_hours) || 0), 0)
        return (
          <div key={plan.id} className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 font-semibold text-gray-900 dark:text-white text-sm flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                {memberNames[plan.user_id] || 'Unknown member'}
                <StatusBadge status={plan.status} />
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{plan.items.length} items · {total.toFixed(1)}h planned</span>
                {canApprove && plan.status === 'submitted' && (
                  <button type="button" onClick={() => setReviewingPlan(plan)}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs font-medium text-white">
                    Review
                  </button>
                )}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Details</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">% Target</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-right">Est. Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {plan.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-900 dark:text-slate-100">{item.details}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs capitalize">{(item.status_code || '').replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs">{item.target_completion_pct != null ? `${item.target_completion_pct}%` : '—'}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-slate-400 text-xs">{item.role_code || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{item.estimated_hours != null ? Number(item.estimated_hours).toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {reviewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setReviewingPlan(null)}>
          <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Review — {memberNames[reviewingPlan.user_id]}'s Work Plan
              </h3>
              <button type="button" onClick={() => setReviewingPlan(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <WorkPlanReviewPanel
              processing={processing}
              onConfirm={handleConfirmDecision}
              onCancel={() => setReviewingPlan(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
