import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import * as platformSvc from '../../services/workAuthorisationService'
import * as simSvc from '../../services/simWorkAuthorisationService'
import { hasPermission } from '../../utils/permissionChecker'
import { platformDb } from '../../services/supabase/supabaseClient'
import { canEditDraft } from '../../services/workAuthorisationTransitions'

export default function WorkAuthorisationDetailPage() {
  const location = useLocation()
  const mode = useMemo(() => (location.pathname.includes('/simulator/') ? 'sim' : 'platform'), [location.pathname])
  const { id } = useParams()
  const navigate = useNavigate()
  const svc = mode === 'sim' ? simSvc : platformSvc
  const basePath = mode === 'sim'
    ? '/simulator/pm/controls/work-authorisations'
    : '/platform/work-authorisations'

  const [row, setRow] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [perm, setPerm] = useState({ request: false, approve: false, suspend: false })

  const projectId = mode === 'platform' ? row?.project_id : null

  const load = useCallback(async () => {
    setLoading(true)
    const res = await svc.getWorkAuthorisation(id)
    const h = await svc.listHistory(id)
    if (res.success) setRow(res.data)
    if (h.success) setHistory(h.data || [])
    setLoading(false)
  }, [id, svc])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    async function p() {
      if (!row) return
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user || cancelled) return
      if (mode === 'platform' && row.project_id) {
        const [req, appr, susp] = await Promise.all([
          hasPermission(user.id, row.project_id, 'work_authorisation.request'),
          hasPermission(user.id, row.project_id, 'work_authorisation.approve'),
          hasPermission(user.id, row.project_id, 'work_authorisation.suspend'),
        ])
        if (!cancelled) setPerm({ request: req, approve: appr, suspend: susp })
      } else if (mode === 'sim') {
        if (!cancelled) setPerm({ request: true, approve: true, suspend: true })
      }
    }
    p()
    return () => { cancelled = true }
  }, [row, mode])

  async function run(action) {
    const res = await svc.transition(id, action, notes.trim() || null)
    if (res.success) {
      toast.success(`Record ${id}: ${action} completed.`)
      setNotes('')
      load()
    } else {
      toast.error(res.message || 'Action failed')
    }
  }

  if (loading && !row) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }
  if (!row) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Not found.</div>
  }

  const label = mode === 'platform'
    ? row.project?.project_name
    : row.practice_project?.project_name

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="font-mono text-sm text-gray-500">{row.reference_code}</p>
            <h1 className="text-2xl font-bold">{row.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</p>
          </div>
          <span className="h-fit px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">{row.status}</span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Action type</dt>
            <dd>{row.action_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Updated</dt>
            <dd>{row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</dd>
          </div>
          {row.rationale && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Rationale</dt>
              <dd className="whitespace-pre-wrap">{row.rationale}</dd>
            </div>
          )}
          {row.risk_impact_summary && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Risk / impact</dt>
              <dd className="whitespace-pre-wrap">{row.risk_impact_summary}</dd>
            </div>
          )}
        </dl>

        {canEditDraft(row.status) && (
          <Link
            to={`${basePath}/${id}/edit`}
            className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit draft
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Decisions</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this action"
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {row.status === 'draft' && perm.request && (
            <button type="button" onClick={() => run('submit')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
              Submit for review
            </button>
          )}
          {row.status === 'deferred' && perm.request && (
            <button type="button" onClick={() => run('resubmit')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
              Resubmit
            </button>
          )}
          {row.status === 'in_review' && perm.approve && (
            <>
              <button type="button" onClick={() => run('approve')} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm">Approve</button>
              <button type="button" onClick={() => run('reject')} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm">Reject</button>
              <button type="button" onClick={() => run('defer')} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm">Defer</button>
            </>
          )}
          {row.status === 'approved' && perm.request && (
            <button type="button" onClick={() => run('execute')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Mark executed</button>
          )}
          {row.status === 'executed' && perm.request && (
            <button type="button" onClick={() => run('close')} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm">Close</button>
          )}
          {perm.suspend && !['rejected', 'closed', 'cancelled'].includes(row.status) && row.status !== 'suspended' && (
            <button type="button" onClick={() => run('suspend')} className="px-4 py-2 rounded-lg border border-gray-400 text-sm">Suspend</button>
          )}
          {row.status === 'suspended' && perm.suspend && (
            <button type="button" onClick={() => run('resume')} className="px-4 py-2 rounded-lg border border-gray-400 text-sm">Resume</button>
          )}
          {perm.request && ['draft', 'in_review', 'deferred', 'approved'].includes(row.status) && (
            <button type="button" onClick={() => run('cancel')} className="px-4 py-2 rounded-lg text-sm text-red-600 dark:text-red-400">
              Cancel request
            </button>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-3">History</h2>
        <ul className="space-y-2 text-sm">
          {history.map((h, index) => (
            <li key={h.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{h.action}</span>
                <span className="text-gray-500 text-xs">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {(h.from_status || '—')} → {h.to_status}
                {h.actor?.full_name ? ` · ${h.actor.full_name}` : ''}
              </p>
              {h.notes && <p className="mt-1 whitespace-pre-wrap">{h.notes}</p>}
            </li>
          ))}
        </ul>
      </div>

      {projectId && (
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          Project ID: {projectId}
        </p>
      )}
    </div>
  )
}
