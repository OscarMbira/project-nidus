import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listThresholds, saveThreshold } from '../../services/expenseClaimService'

export default function ExpenseApprovalThresholds() {
  const [accountId, setAccountId] = useState(null)
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ threshold_name: 'Standard', min_amount: 0, max_amount: '', required_approval_level: 2 })

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) return
      const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (!u?.id) return
      const { data: a } = await platformDb.from('accounts').select('id').eq('owner_user_id', u.id).maybeSingle()
      if (a?.id) {
        setAccountId(a.id)
        listThresholds(a.id).then(setRows).catch(() => {})
      }
    })()
  }, [])

  const add = async (e) => {
    e.preventDefault()
    if (!accountId) {
      toast.error('No organisation account')
      return
    }
    try {
      await saveThreshold({
        account_id: accountId,
        threshold_name: form.threshold_name,
        min_amount: Number(form.min_amount),
        max_amount: form.max_amount === '' ? null : Number(form.max_amount),
        required_approval_level: Number(form.required_approval_level),
      })
      toast.success('Saved')
      setRows(await listThresholds(accountId))
    } catch (err) {
      toast.error(err?.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold">Expense approval thresholds</h1>
        <form onSubmit={add} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <input value={form.threshold_name} onChange={(e) => setForm({ ...form, threshold_name: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" placeholder="Name" />
          <input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" placeholder="Min amount" />
          <input type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" placeholder="Max amount (empty = no limit)" />
          <select value={form.required_approval_level} onChange={(e) => setForm({ ...form, required_approval_level: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm">
            <option value={1}>Level 1</option>
            <option value={2}>Level 2</option>
            <option value={3}>Level 3</option>
          </select>
          <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm">Save threshold</button>
        </form>
        <ul className="text-sm space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="border border-gray-800 rounded p-2">{r.threshold_name}: {r.min_amount}–{r.max_amount ?? '∞'} → L{r.required_approval_level}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
