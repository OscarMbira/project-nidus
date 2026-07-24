/**
 * PMO Administrator user management — invites, billing privilege delegation.
 * Route: /platform/pmo-admin/users
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mail, UserPlus, CreditCard, Crown } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { isPlatformBillingEnabled } from '@nidus/config/platformBillingFeatures.js'
import {
  resolveBillingAccess,
  canGrantBillingPrivileges,
  canInvitePmoAdmin,
} from '../../services/billingAccessService'
import {
  listOrgPmoAdmins,
  invitePmoAdministrator,
  grantBillingPrivileges,
  revokeBillingPrivileges,
  transferAccountOwnership,
} from '../../services/accountBillingDelegateService'

export default function PmoAdminUserManagement() {
  const navigate = useNavigate()
  const billingEnabled = isPlatformBillingEnabled()
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [admins, setAdmins] = useState([])
  const [access, setAccess] = useState({ canInvite: false, canGrant: false, isOwner: false })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [transferUserId, setTransferUserId] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!billingEnabled) {
      navigate('/platform/dashboard', { replace: true })
    }
  }, [billingEnabled, navigate])

  const load = useCallback(async () => {
    if (!billingEnabled) return
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) {
        navigate('/platform/login')
        return
      }

      const billing = await resolveBillingAccess(user.id)
      if (!billing.accountId) {
        setError('No organisation account found for your user.')
        return
      }

      setAccountId(billing.accountId)
      setAccess({
        canInvite: await canInvitePmoAdmin(user.id),
        canGrant: await canGrantBillingPrivileges(user.id, billing.accountId),
        isOwner: billing.isOwner,
      })

      const list = await listOrgPmoAdmins(billing.accountId)
      if (list.success) setAdmins(list.data)
      else setError(list.error)
    } catch (e) {
      setError(e.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [navigate, billingEnabled])

  useEffect(() => {
    if (billingEnabled) load()
  }, [load, billingEnabled])

  if (!billingEnabled) return null

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const result = await invitePmoAdministrator(user.id, {
        email: inviteEmail.trim(),
        fullName: inviteName.trim() || undefined,
      })
      if (!result.success) throw new Error(result.error)
      setMessage('PMO Administrator invitation sent.')
      setInviteEmail('')
      setInviteName('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleBilling = async (userId, currentlyHas) => {
    setBusy(true)
    setError(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const fn = currentlyHas ? revokeBillingPrivileges : grantBillingPrivileges
      const result = await fn(user.id, userId, accountId)
      if (!result.success) throw new Error(result.error)
      setMessage(currentlyHas ? 'Billing privileges revoked.' : 'Billing privileges granted.')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferUserId) return
    if (!window.confirm('Transfer legal account ownership to this user? This cannot be undone without their cooperation.')) return
    setBusy(true)
    setError(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const result = await transferAccountOwnership(user.id, transferUserId, accountId)
      if (!result.success) throw new Error(result.error)
      setMessage('Ownership transferred successfully.')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
        Loading user management…
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            PMO administrators and billing privilege delegation
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {access.canInvite && (
        <section className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <UserPlus className="h-5 w-5" /> Invite PMO Administrator
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Invited users receive <strong>pmo_admin</strong> only — no billing privileges unless you grant them separately.
          </p>
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              required
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Full name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" /> Send invitation
            </button>
          </form>
        </section>
      )}

      <section className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="text-lg font-semibold mb-4">PMO Administrators</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-gray-500">No PMO administrators found.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {admins.map((admin) => (
              <li key={admin.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.full_name || admin.email}</p>
                  <p className="text-xs text-gray-500">{admin.email}</p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs">
                    {admin.isAccountOwner && <Crown className="h-3 w-3 text-amber-500" />}
                    {admin.hasBillingPrivileges && !admin.isAccountOwner && <CreditCard className="h-3 w-3 text-blue-500" />}
                    {admin.label}
                  </span>
                </div>
                {access.canGrant && !admin.isAccountOwner && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleBilling(admin.id, admin.hasBillingPrivileges)}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {admin.hasBillingPrivileges ? 'Revoke billing access' : 'Grant billing access'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {access.isOwner && admins.length > 1 && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <h2 className="text-lg font-semibold mb-2">Transfer ownership</h2>
          <p className="text-sm text-gray-500 mb-3">
            Move legal account ownership to another PMO administrator. Billing delegates will be revoked.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              value={transferUserId}
              onChange={(e) => setTransferUserId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">Select new owner…</option>
              {admins.filter((a) => !a.isAccountOwner).map((a) => (
                <option key={a.id} value={a.id}>{a.full_name || a.email}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !transferUserId}
              onClick={handleTransfer}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Transfer ownership
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
