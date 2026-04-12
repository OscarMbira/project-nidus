import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { listBudgetBaselines, createBudgetBaseline } from '../../services/projectCostService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useFinancialPermissions } from '../../hooks/useFinancialPermissions'

export default function ProjectBudgetBaseline() {
  const { projectId } = useParams()
  const { canManage, readOnlyExecutive } = useFinancialPermissions()
  const [rows, setRows] = useState([])
  const [project, setProject] = useState(null)
  const [uid, setUid] = useState(null)
  const [name, setName] = useState('Baseline')
  const [snapshot, setSnapshot] = useState('[]')

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
    setRows(await listBudgetBaselines(projectId))
  }, [projectId])

  useEffect(() => {
    load().catch((e) => toast.error(e?.message))
  }, [load])

  const lockBaseline = async (e) => {
    e.preventDefault()
    if (!canManage || readOnlyExecutive || !uid) return
    try {
      let parsed = []
      try {
        parsed = JSON.parse(snapshot || '[]')
      } catch {
        parsed = []
      }
      await createBudgetBaseline({
        project_id: projectId,
        baseline_name: name,
        version_number: (rows[0]?.version_number || 0) + 1,
        categories_snapshot: parsed,
        created_by_user_id: uid,
        is_locked: true,
        total_amount: null,
      })
      toast.success('Baseline saved')
      load()
    } catch (err) {
      toast.error(err?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Budget baseline</h1>
            <p className="text-sm text-gray-500">{project?.project_code} — {project?.project_name}</p>
          </div>
        </div>
        {canManage && !readOnlyExecutive && (
          <form onSubmit={lockBaseline} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" placeholder="Baseline name" />
            <textarea value={snapshot} onChange={(e) => setSnapshot(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm font-mono" rows={6} placeholder='JSON array e.g. [{"category":"Labour","amount":10000}]' />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Save locked baseline</button>
          </form>
        )}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex justify-between gap-4">
              <div>
                <div className="font-medium">{r.baseline_name} (v{r.version_number})</div>
                <div className="text-xs text-gray-500">{r.locked_at ? `Locked ${r.locked_at}` : 'Not locked'}</div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 max-w-md truncate">{JSON.stringify(r.categories_snapshot)}</div>
            </div>
          ))}
          {rows.length === 0 && <p className="p-6 text-center text-gray-500">No baselines yet.</p>}
        </div>
      </div>
    </div>
  )
}
