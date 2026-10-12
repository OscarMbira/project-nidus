/**
 * v1239 Slice 8.1 / 8.2 — Upgrade (account owner):
 *   - Keep the Planner and pay per seat, or
 *   - Upgrade to the full Nidus PMIS (same data; the payment webhook switches the edition, then
 *     "Open full PMIS" signs in on the Platform — single sign-on is Release 2, D14).
 * Prices come from the subscription catalog (rule 25.1).
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clearPendingPlan } from '../../lib/pendingPlan.js'
import { ExternalLink } from 'lucide-react'
import BackButton from '@nidus/planning/components/BackButton.jsx'
import { useWorkspace } from '../../lib/workspace.jsx'
import { getCatalog, startCheckout, checkoutAmount, platformUrl } from '../../lib/billingApi.js'

const card = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5'
const money = (v, c) => new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD' }).format(Number(v) || 0)

export default function UpgradePage() {
  const { context, isOwner } = useWorkspace()
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [seats, setSeats] = useState(context?.status?.limits?.max_members || 1)
  const [cycle, setCycle] = useState('monthly')

  const [params] = useSearchParams()
  const chosenPlanId = params.get('plan')
  useEffect(() => { clearPendingPlan() }, [])
  useEffect(() => { getCatalog().then(setCatalog).catch((e) => setError(e.message)) }, [])
  // Coming from the pricing page: open on the plan they chose.
  useEffect(() => {
    const chosen = catalog?.planner.find((p) => p.id === chosenPlanId)
    if (chosen) setCycle(chosen.billing_cycle)
  }, [catalog, chosenPlanId])

  if (context?.edition === 'platform') {
    return (
      <div className="max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold">You have the full PMIS</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Your workspace was upgraded. Sign in on the Platform with the same email to use every module; your projects and plans are already there.</p>
        <a href={`${platformUrl()}/login`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Open full PMIS <ExternalLink className="h-4 w-4" /></a>
      </div>
    )
  }

  const pay = async (plan, action) => {
    setBusy(true)
    setError(null)
    try {
      const { checkoutUrl } = await startCheckout({ plan, action, seats, accountId: context.account_id })
      window.location.assign(checkoutUrl)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const plannerPlan = catalog?.planner.find((p) => p.billing_cycle === cycle)
  return (
    <div className="max-w-4xl px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <BackButton />
      <h1 className="text-2xl font-bold">Upgrade</h1>
      {!isOwner && <p className="text-sm text-gray-700 dark:text-gray-300">Only the account owner can change the plan.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!catalog && !error && <p className="text-sm text-gray-600 dark:text-gray-300">Loading plans…</p>}
      {catalog && isOwner && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className={card}>
            <h2 className="font-semibold">Keep the Planner</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unlimited projects, one seat per team member.</p>
            {catalog.planner.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Paid Planner plans are not available yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                <div role="group" aria-label="Billing" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
                  {['monthly', 'yearly'].filter((c) => catalog.planner.some((p) => p.billing_cycle === c)).map((c) => (
                    <button key={c} type="button" aria-pressed={cycle === c} onClick={() => setCycle(c)} className={`px-3 py-1.5 ${cycle === c ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>{c === 'monthly' ? 'Monthly' : 'Yearly'}</button>
                  ))}
                </div>
                <label className="block text-sm">Seats
                  <input type="number" min={1} max={1000} value={seats} onChange={(e) => setSeats(e.target.value)} className="mt-1 w-28 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                </label>
                {plannerPlan && (
                  <button type="button" disabled={busy} onClick={() => pay(plannerPlan, 'planner_subscribe')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50">
                    Pay {money(checkoutAmount(plannerPlan, { action: 'planner_subscribe', seats }), plannerPlan.currency)}
                  </button>
                )}
              </div>
            )}
          </section>
          <section className={card}>
            <h2 className="font-semibold">Upgrade to the full PMIS</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Risks, issues, change control, finance, portfolio and more — your plans move with you.</p>
            <ul className="mt-3 space-y-2">
              {catalog.platform.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{p.plan_name} · {money(p.price, p.currency)}/{p.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span>
                  <button type="button" disabled={busy} onClick={() => pay(p, 'planner_upgrade_platform')} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50">Choose</button>
                </li>
              ))}
              {catalog.platform.length === 0 && <li className="text-sm text-gray-600 dark:text-gray-300">No PMIS plans are available right now.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
