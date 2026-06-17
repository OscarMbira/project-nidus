import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import {
  resolveBillingAccess,
  getSubscriptionBillingAlert,
} from '../../services/billingAccessService'
import { isPlatformBillingEnabled } from '../../config/platformBillingFeatures.js'

const DISMISS_KEY = 'nidus_billing_banner_dismissed'

export default function SubscriptionExpiryBanner() {
  const enabled = isPlatformBillingEnabled()
  const [alert, setAlert] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined

    let cancelled = false

    async function load() {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user || cancelled) return

        const access = await resolveBillingAccess(user.id)
        if (!access.hasBillingAccess || !access.accountId) return

        const billingAlert = await getSubscriptionBillingAlert(access.accountId)
        if (!billingAlert.showBanner || cancelled) return

        const dismissId = `${access.accountId}:${billingAlert.expiryDate || ''}`
        const raw = sessionStorage.getItem(DISMISS_KEY)
        if (raw === dismissId) {
          setDismissed(true)
          return
        }

        setAlert({ ...billingAlert, dismissId })
      } catch (err) {
        console.warn('SubscriptionExpiryBanner:', err)
      }
    }

    load()
    return () => { cancelled = true }
  }, [enabled])

  if (!enabled || !alert || dismissed) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p>{alert.message}</p>
        <Link
          to="/platform/subscription"
          className="mt-1 inline-block font-medium text-amber-300 underline hover:text-amber-200"
        >
          Manage billing →
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss renewal notice"
        className="shrink-0 text-amber-400 hover:text-amber-200"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, alert.dismissId)
          setDismissed(true)
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
