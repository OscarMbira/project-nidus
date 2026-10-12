/**
 * v1239 Slice 8.3 — Switch this workspace to the Project Planner edition (account owner only).
 * Route: /platform/subscription/edition (linked from Subscription & Billing).
 *
 * A downgrade only changes which menus are shown: every record is kept, and upgrading again
 * brings everything back (story: data continuity, 8.5). The warning lists what stays visible —
 * the Planner allow-list — so the owner sees exactly what will be hidden.
 * Simulator parity: not applicable (editions are a Platform account setting).
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'

export default function SwitchEditionPage() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [state, setState] = useState({ loading: true, error: null, account: null, isOwner: false, kept: [] })
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Account and user are independent lookups (rule 66).
        const [accountId, userId] = await Promise.all([getCurrentUserAccountId(), getCurrentUserInternalUserId()])
        const [{ data: account, error: accErr }, { data: kept, error: keptErr }] = await Promise.all([
          platformDb.from('accounts').select('id, account_name, owner_user_id, product_edition').eq('id', accountId).maybeSingle(),
          platformDb.from('planner_menu_allowlist').select('menu_code, menu_items:menu_item_id (menu_label, parent_menu_id)'),
        ])
        if (accErr) throw accErr
        if (keptErr) throw new Error('The Planner edition is not set up in this environment yet (SQL v1249).')
        const labels = [...new Set((kept || []).filter((k) => k.menu_items && !k.menu_items.parent_menu_id).map((k) => k.menu_items.menu_label))]
        if (!cancelled) setState({ loading: false, error: null, account, isOwner: account?.owner_user_id === userId, kept: labels })
      } catch (err) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message || 'Could not load your workspace.' }))
      }
    })()
    return () => { cancelled = true }
  }, [])

  const switchNow = async () => {
    setBusy(true)
    const { error } = await platformDb.rpc('change_account_edition', {
      p_account_id: state.account.id, p_edition: 'planner', p_reason: reason.trim(),
    })
    setBusy(false)
    if (error) { setState((s) => ({ ...s, error: error.message })); return }
    const plannerUrl = import.meta.env.VITE_PLANNER_URL || 'http://localhost:5176'
    showSuccess({
      recordId: state.account.account_name,
      operation: 'updated',
      message: 'Your workspace now uses the Project Planner. All data is kept; upgrade again any time.',
      onOk: () => window.location.assign(`${plannerUrl}/app`),
    })
  }

  const ready = reason.trim().length > 0 && confirmText.trim().toUpperCase() === 'SWITCH'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 max-w-3xl">
      <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Subscription & Billing
      </button>
      <h1 className="text-2xl font-bold mb-1">Switch to Project Planner</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">A lighter edition for teams that only need scheduling.</p>
      {state.loading ? <p className="text-sm">Loading…</p> : state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : state.account?.product_edition === 'planner' ? (
        <p className="text-sm">This workspace already uses the Project Planner.</p>
      ) : !state.isOwner ? (
        <p className="text-sm">Only the account owner can change the edition.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4 text-sm text-amber-900 dark:text-amber-100">
            <p className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Everything outside planning will be hidden</p>
            <p className="mt-1">You will keep: {state.kept.join(', ') || 'the planning menus'}. Risks, issues, change control, finance, portfolio, governance and other PMIS menus are hidden for everyone in <strong>{state.account.account_name}</strong>.</p>
            <p className="mt-1">No data is deleted. Upgrading again brings every menu and record back.</p>
          </div>
          <label className="block text-sm">Reason (recorded in the audit log) *
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
          </label>
          <label className="block text-sm">Type SWITCH to confirm
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1 w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800" />
          </label>
          <button type="button" disabled={!ready || busy} onClick={switchNow} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-50">
            {busy ? 'Switching…' : 'Switch to Project Planner'}
          </button>
        </div>
      )}
      {modal}
    </div>
  )
}
