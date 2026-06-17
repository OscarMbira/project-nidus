import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { resolveBillingAccess } from '../../services/billingAccessService'
import { isPlatformBillingEnabled } from '../../config/platformBillingFeatures.js'

/**
 * Guards subscription/billing routes — billing access required.
 */
export default function BillingAccessGate({ children }) {
  const navigate = useNavigate()
  const billingEnabled = isPlatformBillingEnabled()
  const [state, setState] = useState({ loading: true, allowed: false })

  useEffect(() => {
    if (!billingEnabled) {
      navigate('/platform/dashboard', { replace: true })
      return undefined
    }

    let cancelled = false

    async function check() {
      try {
        const { data: { user } } = await platformDb.auth.getUser()
        if (!user) {
          navigate('/platform/login', { replace: true })
          return
        }

        const access = await resolveBillingAccess(user.id)
        if (cancelled) return

        if (!access.hasBillingAccess) {
          setState({ loading: false, allowed: false })
          return
        }

        setState({ loading: false, allowed: true })
      } catch {
        if (!cancelled) setState({ loading: false, allowed: false })
      }
    }

    check()
    return () => { cancelled = true }
  }, [navigate, billingEnabled])

  if (!billingEnabled) return null

  if (state.loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!state.allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-700 bg-gray-800 p-6 text-center text-gray-100">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <h2 className="text-lg font-semibold mb-2">Billing access required</h2>
        <p className="text-sm text-gray-400 mb-4">
          Billing is managed by your account owner or a PMO administrator with billing access.
          Contact them to manage subscriptions and payments.
        </p>
        <button
          type="button"
          onClick={() => navigate('/platform/dashboard', { replace: true })}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Return to dashboard
        </button>
      </div>
    )
  }

  return children
}
