import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  User,
  Building2,
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react'
import InvitationMessageDisplay from './InvitationMessageDisplay'
import {
  resolveInviteeNamesForInvitation,
  resolveInviterDisplayName,
} from '../../utils/invitationInviteeFormat'

function formatDisplayDate(value) {
  if (!value) return '—'
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number)
    const local = new Date(year, month - 1, day)
    if (Number.isNaN(local.getTime())) return '—'
    return local.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatEntityType(type) {
  if (!type) return '—'
  return String(type).charAt(0).toUpperCase() + String(type).slice(1)
}

function daysUntil(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const diff = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase()
  const configs = {
    pending: {
      icon: AlertCircle,
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    },
    accepted: {
      icon: CheckCircle2,
      cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    },
    declined: {
      icon: XCircle,
      cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800',
    },
    expired: {
      icon: Clock,
      cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600',
    },
    cancelled: {
      cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    },
  }
  const cfg = configs[s] || configs.cancelled
  const Icon = cfg?.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium capitalize ${cfg.cls}`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {s || 'unknown'}
    </span>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
        {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-900 dark:text-white break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60">
        {Icon ? <Icon className="h-4 w-4 text-blue-600 shrink-0" aria-hidden /> : null}
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  )
}

export default function InvitationDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const invitation = location.state?.invitation

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        <Info className="h-12 w-12 text-slate-400 mb-4" aria-hidden />
        <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
          No invitation data found. Please return to the tracker and try again.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Tracker
        </button>
      </div>
    )
  }

  const { full: inviteeFullName } = resolveInviteeNamesForInvitation(invitation)
  const inviterDisplayName = resolveInviterDisplayName(invitation)
  const expiryDays = daysUntil(invitation.expires_at || invitation.invitation_expires_at)
  const entityType = formatEntityType(invitation.entity_type)
  const entityName = invitation.project_name || invitation.entity_name || '—'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Back button + page title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Invitation Details</h1>
        </div>

        {/* Hero header */}
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white shadow-md">
          <div className="flex items-start gap-3">
            <Briefcase className="h-7 w-7 shrink-0 mt-0.5 opacity-90" aria-hidden />
            <div className="min-w-0">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">{entityType}</p>
              <h2 className="text-xl font-bold leading-snug">{entityName}</h2>
              <p className="mt-1.5 text-blue-100 text-sm">
                Role:{' '}
                <span className="font-semibold text-white">
                  {invitation.role_display_name || invitation.role_name || '—'}
                </span>
              </p>
              <div className="mt-3">
                <StatusBadge status={invitation.invitation_status} />
              </div>
            </div>
          </div>
        </div>

        {/* Invitee information */}
        <SectionCard title="Invitee Information" icon={User}>
          <DetailRow icon={User} label="Name" value={inviteeFullName || '—'} />
          <DetailRow icon={Mail} label="Email address" value={invitation.invited_email} />
          <DetailRow icon={User} label="Invited by" value={inviterDisplayName} />
          <DetailRow icon={Building2} label="Organisation" value={invitation.organisation_name} />
        </SectionCard>

        {/* Appointment terms */}
        <SectionCard title="Appointment Terms" icon={Shield}>
          <DetailRow
            icon={Briefcase}
            label="Appointed role"
            value={invitation.role_display_name || invitation.role_name}
          />
          <DetailRow icon={Briefcase} label="Entity type" value={entityType} />
          <DetailRow icon={Briefcase} label={`${entityType} name`} value={entityName} />
          <DetailRow
            icon={Calendar}
            label="Appointment start"
            value={formatDisplayDate(invitation.planned_start_date)}
          />
          <DetailRow
            icon={Calendar}
            label="Appointment end"
            value={formatDisplayDate(invitation.planned_end_date)}
          />
          <DetailRow
            icon={Clock}
            label="Invitation expires"
            value={
              invitation.expires_at || invitation.invitation_expires_at
                ? `${formatDisplayDate(invitation.expires_at || invitation.invitation_expires_at)}${
                    expiryDays !== null
                      ? expiryDays > 0
                        ? ` (${expiryDays} day${expiryDays !== 1 ? 's' : ''} remaining)`
                        : expiryDays === 0
                          ? ' (expires today)'
                          : ' (expired)'
                      : ''
                  }`
                : '—'
            }
          />
          <DetailRow icon={Clock} label="Invitation sent" value={formatShortDate(invitation.invitation_sent_at || invitation.sent_at)} />
        </SectionCard>

        {/* Invitation message */}
        {invitation.invitation_message ? (
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2 px-1">
              Message from Inviter
            </h2>
            <InvitationMessageDisplay
              message={invitation.invitation_message}
              organisationName={invitation.organisation_name || ''}
              inviterName={inviterDisplayName}
              inviteeDisplayName={inviteeFullName}
            />
          </div>
        ) : null}

      </div>
    </div>
  )
}
