import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { getMyExpenses, saveDraft, submitExpense } from '../../services/expenseClaimService'
import { platformDb } from '../../services/supabase/supabaseClient'

export default function MyExpenses() {
  const [rows, setRows] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ project_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) })

  const load = async () => {
    try {
      setRows(await getMyExpenses())
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!u?.id) return
      const { data: up } = await platformDb.from('user_projects').select('project_id').eq('user_id', u.id).eq('is_deleted', false).limit(100)
      const ids = [...new Set((up || []).map((x) => x.project_id).filter(Boolean))]
      if (!ids.length) {
        setProjects([])
        return
      }
      const { data: projs } = await platformDb.from('projects').select('id, project_code, project_name').in('id', ids)
      setProjects(projs || [])
      if (projs?.[0] && !form.project_id) setForm((f) => ({ ...f, project_id: projs[0].id }))
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    try {
      await saveDraft({ ...form, amount: Number(form.amount) })
      toast.success('Draft saved')
      load()
    } catch (e) {
      toast.error(e?.message)
    }
  }

  const submit = async (id) => {
    try {
      await submitExpense(id)
      toast.success('Submitted')
      load()
    } catch (e) {
      toast.error(e?.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">My expenses</h1>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
          <h2 className="font-semibold">New claim</h2>
          <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
            ))}
          </select>
          <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" />
          <input placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" rows={3} />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="px-4 py-2 rounded-lg border border-gray-600 text-sm">Save draft</button>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{r.projects?.project_code} — {r.amount} {r.currency}</div>
                <div className="text-xs text-gray-500">{r.claim_status} · {r.expense_date}</div>
              </div>
              {r.claim_status === 'draft' && (
                <button type="button" onClick={() => submit(r.id)} className="text-sm text-blue-400">Submit</button>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="p-6 text-center text-gray-500">No expense claims yet.</p>}
        </div>
        <Link to="/platform/expenses/approvals" className="text-blue-400 text-sm hover:underline">Go to approvals</Link>
      </div>
    </div>
  )
}
