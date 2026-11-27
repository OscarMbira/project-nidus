/**
 * v1358 Slice 3a (PRD D5) — keeps people out of an organisation that is locked for deletion.
 * Wraps the signed-in app in Platform (ProtectedRoute) and Planner (app shell).
 *   - not locked (or the status cannot be read, e.g. before the SQL runs): renders the app unchanged
 *   - locked, Account Owner, on the Data export & deletion page: the page, with a notice (download the final
 *     export, or cancel the deletion)
 *   - locked, anyone else / any other page: a closing notice; the owner gets a link to the page above
 * The status is cached for a minute per tab so page changes do not repeat the call.
 */
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getOrganisationLockStatus } from '@nidus/shared/services/organisationDataService'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'

const CACHE_MS = 60_000
let cache = null

export function clearOrganisationLockCache() { cache = null }

export default function OrganisationLockGate({ children, allowPath, onSignOut, db = platformDb }) {
  const { pathname } = useLocation()
  const [status, setStatus] = useState(() => (cache && Date.now() - cache.at < CACHE_MS ? cache.value : null))
  const fromCache = status !== null
  const settings = useRegionalFormatSettings()

  useEffect(() => {
    if (fromCache) return undefined
    let cancelled = false
    getOrganisationLockStatus(db)
      .then((value) => { cache = { at: Date.now(), value }; if (!cancelled) setStatus(value) })
      .catch(() => { if (!cancelled) setStatus({ locked: false }) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db])

  if (!status?.locked) return children

  const due = status.deletion_due_at ? formatRegionalDate(status.deletion_due_at, settings) : null
  const onAllowedPage = status.is_owner && allowPath && pathname.startsWith(allowPath)

  if (onAllowedPage) {
    return (
      <>
        <div role="status" className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {status.organisation} is locked{due ? ` and will be deleted on ${due}` : ''}. Download the final export below, or cancel the
            deletion to unlock it.
          </span>
        </div>
        {children}
      </>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white p-4 dark:bg-gray-950">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <Lock className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-400" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{status.organisation} is closing</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {status.is_owner
            ? `You asked for this organisation to be deleted${due ? `. It will be deleted on ${due}` : ''}. Until then you can download the final export or cancel the deletion.`
            : `The Account Owner has asked for this organisation to be deleted${due ? ` on ${due}` : ''}, so it can no longer be used. Your own account and any other organisations you belong to are not affected.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {status.is_owner && allowPath && (
            <Link to={allowPath} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Open Data export &amp; deletion
            </Link>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
