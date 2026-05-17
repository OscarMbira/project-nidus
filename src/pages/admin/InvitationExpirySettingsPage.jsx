/**
 * PMO: default project invitation expiry (days) per organisation account.
 * Route: /platform/admin/invitation-settings
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Loader, AlertCircle, CheckCircle } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../../features/local-data-extensions/utils/bootstrapLdeAccount'
import { isPmoAdmin } from '../../services/organisationRoleService'
import {
  clampInvitationExpiryDays,
  fetchAccountInvitationExpiryDays,
  saveAccountInvitationExpiryDays,
  INVITE_EXPIRY_MIN_DAYS,
  INVITE_EXPIRY_MAX_DAYS,
  INVITE_EXPIRY_FALLBACK_DAYS,
} from '../../services/invitationExpiryService'

export default function InvitationExpirySettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [accountId, setAccountId] = useState(null)
  const [allowed, setAllowed] = useState(false)
  const [days, setDays] = useState(INVITE_EXPIRY_FALLBACK_DAYS)
  const [savedDays, setSavedDays] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user?.id) {
        navigate('/login')
        return
      }

      const pmo = await isPmoAdmin(user.id)
      if (!pmo) {
        setAllowed(false)
        setLoading(false)
        return
      }
      setAllowed(true)

      const { accountId: aid } = await resolveLdeAccountForCurrentUser()
      if (!aid) {
        setError(
          'No organisation account is linked to your profile. Contact support if this should not happen.',
        )
        setAccountId(null)
        setLoading(false)
        return
      }

      setAccountId(aid)
      const res = await fetchAccountInvitationExpiryDays(aid)
      if (!res.success) {
        setError(res.error || 'Could not load current setting.')
      }
      const d = res.days
      setDays(d)
      setSavedDays(d)
    } catch (e) {
      console.error('[InvitationExpirySettings]', e)
      setError(e?.message || 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load().catch((e) => console.error(e))
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!accountId) return

    const next = clampInvitationExpiryDays(days)
    setSaving(true)
    try {
      const res = await saveAccountInvitationExpiryDays(accountId, next)
      if (!res.success) {
        setError(res.error || 'Save failed.')
        return
      }
      setDays(res.days)
      setSavedDays(res.days)
      setSuccess(
        `Organisation default saved: new project invitations expire ${res.days} calendar day${res.days === 1 ? '' : 's'} after they are sent.`,
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500 shrink-0" aria-hidden />
            Invitation expiry
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Default number of days before{' '}
            <strong className="font-medium text-gray-800 dark:text-gray-200">project invitations</strong>{' '}
            expire for your organisation. Project Managers can still send invitations from project screens;
            those uses apply this default unless a shorter override is chosen where offered.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[30vh] gap-3 text-gray-600 dark:text-gray-400">
          <Loader className="h-9 w-9 animate-spin text-emerald-500" />
          Loading settings…
        </div>
      )}

      {!loading && !allowed && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 flex gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h2 className="font-semibold text-red-900 dark:text-red-100">Access denied</h2>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              Only PMO Administrators can change organisation invitation expiry defaults.
            </p>
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}

      {!loading && allowed && accountId && (
        <>
          {error && (
            <div className="mb-4 p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 flex gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-6"
          >
            <div>
              <label
                htmlFor="invitation-expiry-days"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Default expiry (days)
              </label>
              <input
                id="invitation-expiry-days"
                type="number"
                min={INVITE_EXPIRY_MIN_DAYS}
                max={INVITE_EXPIRY_MAX_DAYS}
                required
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Between {INVITE_EXPIRY_MIN_DAYS} and {INVITE_EXPIRY_MAX_DAYS} days. Invitations stop working
                after this period unless resent.
              </p>
              {savedDays != null && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Current saved value: <span className="font-mono">{savedDays}</span> days · Account ID:{' '}
                  <span className="font-mono break-all">{accountId}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save default'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/platform/admin/send-role-invites')}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Send role invitations
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
