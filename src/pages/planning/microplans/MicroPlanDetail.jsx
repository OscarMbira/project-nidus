import { useEffect, useState, useCallback } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, History, ClipboardList } from 'lucide-react'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/microPlanService'
import * as simApi from '../../../services/sim/simMicroPlanService'
import { platformDb } from '../../../services/supabase/supabaseClient'

export default function MicroPlanDetail() {
  const { microPlanId } = useParams()
  const isSim = useLocation().pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const base = isSim ? '/simulator/pm/planning' : '/pm/planning'
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const load = useCallback(async () => {
    if (!microPlanId) return
    setLoading(true)
    try {
      const data = isSim ? await simApi.getMicroPlan(microPlanId) : await api.getMicroPlan(microPlanId)
      setPlan(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load micro-plan')
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [microPlanId, isSim])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async () => {
    if (!microPlanId) return
    try {
      setApproving(true)
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (!user?.id) throw new Error('Not signed in')
      const row = isSim
        ? await simApi.approveMicroPlan(microPlanId, user.id, 'Approved from detail view')
        : await api.approveMicroPlan(microPlanId, user.id, 'Approved from detail view')
      setPlan((p) => (p ? { ...p, ...row } : row))
      toast.success(`Approved · version ${row.version_number || '—'}`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Approve failed')
    } finally {
      setApproving(false)
    }
  }

  const handleRestore = async (versionId) => {
    if (!microPlanId || !versionId) return
    if (!window.confirm('Restore this version? Plan will move to draft.')) return
    try {
      setRestoring(true)
      const full = isSim
        ? await simApi.restoreVersion(microPlanId, versionId)
        : await api.restoreVersion(microPlanId, versionId)
      setPlan(full)
      toast.success('Version restored — plan is now draft.')
      load()
    } catch (e) {
      toast.error(e?.message || 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
        <p className="text-gray-400">Micro-plan not found.</p>
        <Link to={projectId ? `${base}/microplans?projectId=${projectId}` : base} className="text-blue-400 mt-2 inline-block">
          ← Back to list
        </Link>
      </div>
    )
  }

  const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
  const canApprove = plan.status === 'draft' || plan.status === 'under_review'

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`${base}/microplans${q}`}
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to micro-plans
        </Link>

        <PlanningProjectBar isSim={isSim} />

        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-indigo-400" />
                {plan.plan_name}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {plan.plan_reference} · {plan.plan_type} · {plan.status} · RAG {plan.overall_rag || '—'}
              </p>
            </div>
            {canApprove && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {approving ? 'Approving…' : 'Approve & version'}
              </button>
            )}
          </div>

          {plan.description && (
            <p className="mt-4 text-sm text-gray-300 whitespace-pre-wrap border-t border-gray-700 pt-4">{plan.description}</p>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-400 mb-2">Activities</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-800/80 text-left text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Progress</th>
                    <th className="px-3 py-2">End</th>
                  </tr>
                </thead>
                <tbody>
                  {(plan.activities || []).map((a) => (
                    <tr key={a.id} className="border-t border-gray-700/80">
                      <td className="px-3 py-2 text-gray-200">{a.activity_name}</td>
                      <td className="px-3 py-2 text-gray-400">{a.status}</td>
                      <td className="px-3 py-2 text-gray-400">{a.progress_pct ?? 0}%</td>
                      <td className="px-3 py-2 text-gray-500">{a.planned_end_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!plan.activities || plan.activities.length === 0) && (
                <p className="p-4 text-gray-500 text-sm">No activities.</p>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-gray-700 pt-6">
            <h2 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Version history
            </h2>
            <ul className="space-y-2">
              {(plan.versions || []).map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 text-sm"
                >
                  <span className="text-gray-300">
                    v{v.version_number} · {v.change_summary || '—'} · {v.created_at ? new Date(v.created_at).toLocaleString() : ''}
                  </span>
                  <button
                    type="button"
                    disabled={restoring}
                    onClick={() => handleRestore(v.id)}
                    className="text-amber-400 hover:text-amber-300 text-xs disabled:opacity-50"
                  >
                    Restore snapshot
                  </button>
                </li>
              ))}
            </ul>
            {(!plan.versions || plan.versions.length === 0) && <p className="text-gray-500 text-sm">No versions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
