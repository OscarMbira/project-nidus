import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { listEvmSnapshots, upsertEvmSnapshot, computeEvmMetrics } from '../../services/evmService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useFinancialPermissions } from '../../hooks/useFinancialPermissions'

export default function ProjectEVMPage() {
  const { projectId } = useParams()
  const { canManage, readOnlyExecutive } = useFinancialPermissions()
  const [rows, setRows] = useState([])
  const [project, setProject] = useState(null)
  const [uid, setUid] = useState(null)
  const [bac, setBac] = useState('100000')
  const [form, setForm] = useState({ period_date: new Date().toISOString().slice(0, 10), planned_value: '', earned_value: '', actual_cost: '' })

  const load = useCallback(async () => {
    const { data: p } = await platformDb.from('projects').select('project_name, project_code').eq('id', projectId).single()
    setProject(p)
    const {
      data: { user },
    } = await platformDb.auth.getUser()
    if (user) {
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      setUid(u?.id || null)
    }
    setRows(await listEvmSnapshots(projectId))
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const latest = rows[rows.length - 1]
  const metrics = useMemo(() => (latest ? computeEvmMetrics(latest, Number(bac) || 0) : null), [latest, bac])

  const save = async (e) => {
    e.preventDefault()
    if (!canManage || readOnlyExecutive || !uid) return
    try {
      await upsertEvmSnapshot({
        project_id: projectId,
        period_date: form.period_date,
        planned_value: Number(form.planned_value) || 0,
        earned_value: Number(form.earned_value) || 0,
        actual_cost: Number(form.actual_cost) || 0,
        created_by_user_id: uid,
      })
      toast.success('EVM period saved')
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Earned value management</h1>
            <p className="text-sm text-gray-500">{project?.project_code} — {project?.project_name}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">BAC (budget at completion)</label>
          <input value={bac} onChange={(e) => setBac(e.target.value)} className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1 text-sm" />
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">SPI: {metrics.spi != null ? metrics.spi.toFixed(3) : '—'}</div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">CPI: {metrics.cpi != null ? metrics.cpi.toFixed(3) : '—'}</div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">EAC: {metrics.eac != null ? metrics.eac.toFixed(0) : '—'}</div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">VAC: {metrics.vac != null ? metrics.vac.toFixed(0) : '—'}</div>
          </div>
        )}

        {canManage && !readOnlyExecutive && (
          <form onSubmit={save} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 grid md:grid-cols-5 gap-2">
            <input type="date" value={form.period_date} onChange={(e) => setForm({ ...form, period_date: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <input placeholder="PV" value={form.planned_value} onChange={(e) => setForm({ ...form, planned_value: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <input placeholder="EV" value={form.earned_value} onChange={(e) => setForm({ ...form, earned_value: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <input placeholder="AC" value={form.actual_cost} onChange={(e) => setForm({ ...form, actual_cost: e.target.value })} className="rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm" />
            <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Save period</button>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">EV</th>
                <th className="px-3 py-2 text-right">AC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">{r.period_date}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.planned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.earned_value}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.actual_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
