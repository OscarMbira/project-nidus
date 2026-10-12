/**
 * v1239 Slice 5 — Planner workspace settings (account owner): rename the workspace (the
 * organisation auto-created at sign-up, D4) and shortcuts to the other settings screens the
 * owner's menu grants. Also shows the plan's limits and trial status.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Save } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useWorkspace } from '../../lib/workspace.jsx'

const input = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const card = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5'
const show = (v, unit) => (v === null || v === undefined ? `Unlimited ${unit}` : `${v} ${unit}`)

export default function SettingsPage() {
  const { context, isOwner, reload } = useWorkspace()
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('details')
  const [name, setName] = useState(context?.account_name || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const dirty = name !== (context?.account_name || '')
  useUnsavedChangesGuard(dirty, 'Leave without saving the workspace name?')
  const status = context?.status || {}
  const limits = status.limits || {}

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { data, error: rpcError } = await platformDb.rpc('planner_rename_account', { p_account_name: name })
      if (rpcError) throw new Error(rpcError.message)
      showSuccess({ recordId: data.account_name, operation: 'updated', message: 'Workspace renamed.' })
      await reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <DetailAuditTabList activeTab={tab} onChange={setTab} />
      {tab === 'audit' ? (
        <div className={`${card} text-sm space-y-1`}>
          <p><span className="text-gray-500 dark:text-gray-400">Workspace:</span> {context?.account_name}</p>
          <p><span className="text-gray-500 dark:text-gray-400">Edition:</span> {context?.edition === 'planner' ? 'Project Planner' : 'Full PMIS'}</p>
          <p className="text-gray-500 dark:text-gray-400">Changes to the workspace name are recorded in the audit log.</p>
        </div>
      ) : (
        <>
          <form onSubmit={save} className={`${card} space-y-3`}>
            <label className="block text-sm">Workspace name
              <input className={input} value={name} maxLength={200} disabled={!isOwner || busy} onChange={(e) => setName(e.target.value)} />
            </label>
            {!isOwner && <p className="text-xs text-gray-500 dark:text-gray-400">Only the account owner can rename the workspace.</p>}
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {isOwner && (
              <button type="submit" disabled={!dirty || busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
            )}
          </form>
          <section className={card}>
            <h2 className="font-semibold">Your plan</h2>
            <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>{status.is_paid ? 'Paid plan' : status.is_trial ? `Free trial — ${status.days_left ?? 0} day(s) left` : status.read_only ? 'Trial ended (read-only)' : '—'}</li>
              <li>{show(limits.max_projects, 'projects')} · {show(limits.max_members, 'members')} · {show(limits.max_tasks_per_project, 'tasks per project')}</li>
            </ul>
            {!status.is_paid && <Link to="/app/upgrade" className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 underline">Upgrade</Link>}
          </section>
        </>
      )}
      {modal}
    </div>
  )
}
