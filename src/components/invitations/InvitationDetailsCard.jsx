/**
 * Shared invitation details card for accept, decline confirmation, and declined success views.
 */

import { Briefcase, Calendar } from 'lucide-react'
import InvitationMessageDisplay from './InvitationMessageDisplay'
import {
  resolveInviteeNamesForInvitation,
  resolveInviterDisplayName,
} from '../../utils/invitationInviteeFormat'

export const INVITATION_CARD_CLASS =
  'bg-white dark:bg-gray-800 rounded-xl shadow-lg shadow-gray-300/40 dark:shadow-none border border-gray-200 dark:border-gray-700 overflow-hidden'

function formatInvitationDisplayDate(value) {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number)
    const local = new Date(year, month - 1, day)
    if (Number.isNaN(local.getTime())) return null
    return local.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function InvitationDetailCell({ label, value, showCalendarIcon = false }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 border border-gray-100 dark:border-gray-700 min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {showCalendarIcon ? <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-gray-900 dark:text-white break-words leading-snug">
        {value || '—'}
      </dd>
    </div>
  )
}

export default function InvitationDetailsCard({ invitation }) {
  const expiresLabel = formatInvitationDisplayDate(invitation.expires_at)
  const projectStartLabel = formatInvitationDisplayDate(invitation.planned_start_date)
  const projectEndLabel = formatInvitationDisplayDate(invitation.planned_end_date)
  const { full: inviteeFullName } = resolveInviteeNamesForInvitation(invitation)
  const inviterDisplayName = resolveInviterDisplayName(invitation)

  return (
    <div className={INVITATION_CARD_CLASS}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
        <div className="flex items-start gap-3">
          <Briefcase className="h-6 w-6 flex-shrink-0 mt-0.5 opacity-90" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug">{invitation.project_name}</h2>
            <p className="mt-1 text-sm text-blue-100">
              {inviteeFullName ? (
                <>
                  Invitation for{' '}
                  <span className="font-medium text-white">{inviteeFullName}</span>
                  {' · '}
                </>
              ) : null}
              Role:{' '}
              <span className="font-medium text-white">{invitation.role_display_name}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InvitationDetailCell label="Name" value={inviteeFullName} />
            <InvitationDetailCell label="Your email" value={invitation.invited_email} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InvitationDetailCell label="Sent by" value={inviterDisplayName} />
            <InvitationDetailCell label="Organisation" value={invitation.organisation_name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InvitationDetailCell
              label="Invitation expires"
              value={expiresLabel}
              showCalendarIcon
            />
            <InvitationDetailCell label="Role" value={invitation.role_display_name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InvitationDetailCell label="Project start" value={projectStartLabel} showCalendarIcon />
            <InvitationDetailCell label="Project end" value={projectEndLabel} showCalendarIcon />
          </div>
        </dl>

        {invitation.invitation_message ? (
          <InvitationMessageDisplay
            message={invitation.invitation_message}
            organisationName={invitation.organisation_name || ''}
            inviterName={inviterDisplayName}
            inviteeDisplayName={inviteeFullName}
          />
        ) : null}
      </div>
    </div>
  )
}
