/**
 * v1239 Slice 8.1 — Billing (account owner): current plan and Planner payments. Paynow returns
 * here (`?ref=`); the webhook may take a moment, so the page offers a refresh.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PlanningTable from '@nidus/planning/components/PlanningTable.jsx'
import { useWorkspace } from '../../lib/workspace.jsx'
import { listPayments } from '../../lib/billingApi.js'

export default function BillingPage() {
  const [params] = useSearchParams()
  const { context, reload } = useWorkspace()
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)
  const ref = params.get('ref')
  const status = context?.status || {}

  const load = useCallback(async () => {
    if (!context?.account_id) return
    try { setRows(await listPayments(context.account_id)) } catch (e) { setError(e.message) }
  }, [context?.account_id])
  useEffect(() => { load() }, [load])

  const current = rows.find((r) => r.reference === ref)
  return (
    <div className="px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Billing</h1>
      {ref && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3 text-sm text-blue-900 dark:text-blue-100 flex flex-wrap items-center justify-between gap-2">
          <span>Payment {ref}: {current ? current.status : 'waiting for confirmation'}.</span>
          <button type="button" onClick={() => { load(); reload() }} className="underline">Refresh</button>
        </div>
      )}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-sm">
        <p>{context?.edition === 'platform' ? 'Full PMIS' : status.is_paid ? 'Planner — paid' : status.is_trial ? `Planner — free trial (${status.days_left ?? 0} day(s) left)` : 'Planner — trial ended'}</p>
        {status.is_paid && <p className="text-gray-600 dark:text-gray-400">Seats: {status.limits?.max_members ?? '—'}</p>}
        <Link to="/app/upgrade" className="mt-2 inline-block text-blue-600 dark:text-blue-400 underline">Change plan</Link>
      </section>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <PlanningTable
        pageId="planner-payments"
        keepOrder
        columns={[
          { key: 'reference', label: 'Reference' },
          { key: 'created_at', label: 'Date', value: (r) => String(r.created_at || '').slice(0, 10) },
          { key: 'amount', label: 'Amount', value: (r) => `${r.currency || ''} ${Number(r.amount || 0).toFixed(2)}` },
          { key: 'status', label: 'Status' },
        ]}
        rows={rows}
        exportName="PlannerPayments"
        emptyText="No payments yet."
      />
    </div>
  )
}
