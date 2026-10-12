/**
 * v1239 Slice 5.3 — Pricing, read from the database (subscription_plans planner rows +
 * planner_plan_limits). Nothing is hard-coded (rule 25.1): until the owner activates priced
 * planner plans, only the free trial is shown.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from './PublicLayout.jsx'
import { getPricing } from '../../lib/plannerApi.js'
import { useAuth } from '../../lib/auth.jsx'
import { planCtaPath } from '../../lib/pendingPlan.js'

const limitText = (v, unit) => (v === null || v === undefined ? `Unlimited ${unit}` : `${v} ${unit}`)

export default function PricingPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { getPricing().then(setData).catch((e) => setError(e.message)) }, [])
  const trial = data?.limits?.trial
  const paid = data?.limits?.paid

  return (
    <PublicLayout>
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center">Pricing</h1>
        {error && <p role="alert" className="mt-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!data && !error && <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">Loading…</p>}
        {data && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trial && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <h2 className="text-lg font-semibold">Free trial</h2>
                <p className="mt-1 text-3xl font-bold">{trial.trial_days} days</p>
                <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>{limitText(trial.max_projects, 'projects')}</li>
                  <li>{limitText(trial.max_members, 'members')}</li>
                  <li>{limitText(trial.max_tasks_per_project, 'tasks per project')}</li>
                  <li>No card needed</li>
                </ul>
                <Link to="/signup" className="mt-6 block text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Start free trial</Link>
              </div>
            )}
            {data.plans.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <h2 className="text-lg font-semibold">{p.plan_name}</h2>
                <p className="mt-1 text-3xl font-bold">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency: p.currency || 'USD' }).format(Number(p.price))}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / seat / {p.billing_cycle === 'yearly' ? 'year' : 'month'}</span>
                </p>
                {paid && (
                  <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>{limitText(paid.max_projects, 'projects')}</li>
                    <li>{limitText(paid.max_tasks_per_project, 'tasks per project')}</li>
                    <li>One seat per team member</li>
                  </ul>
                )}
                <Link to={planCtaPath(p.id, !!user)} className="mt-6 block text-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">
                  {user ? 'Subscribe' : 'Sign up and subscribe'}
                </Link>
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">Choose how many seats at checkout.</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
