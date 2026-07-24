import { Link } from 'react-router-dom'
import { AlertCircle, Sparkles } from 'lucide-react'
import { isTesterSubscription } from '../services/platformSubscriptionService'

function daysUntil(expiresAt) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt) - Date.now()) / (24 * 60 * 60 * 1000))
}

/**
 * Shown when the user has (or recently had) a system-tester moratorium subscription.
 */
export default function TesterMoratoriumBanner({ subscription, pricingPath = '/pricing' }) {
  if (!subscription?.is_tester) return null

  const active = isTesterSubscription(subscription)
  const days = daysUntil(subscription.expires_at)

  if (active && days != null && days > 90) return null

  const expired = !active || (days != null && days < 0)

  return (
    <div
      className={`mb-6 rounded-lg border p-4 ${
        expired
          ? 'border-amber-500/40 bg-amber-950/30'
          : 'border-blue-500/40 bg-blue-950/20'
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {expired ? (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        ) : (
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-100">
            {expired ? 'Your tester moratorium has ended' : 'System tester moratorium'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {expired
              ? 'Subscribe to keep full access to projects, teams, and premium features.'
              : days != null
                ? `Your free tester access ends in ${days} day${days === 1 ? '' : 's'} (${new Date(subscription.expires_at).toLocaleDateString()}).`
                : 'Your moratorium is active.'}
          </p>
          <Link
            to={pricingPath}
            className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            {expired ? 'View subscription plans' : 'Upgrade early'}
          </Link>
        </div>
      </div>
    </div>
  )
}
