import { Calendar, Briefcase, Percent, User, MapPin, ListChecks } from 'lucide-react'

function fmtDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString()
}

/**
 * Read-only team member appointment terms.
 */
export default function TeamMemberTermsCard({ record, className = '' }) {
  if (!record) return null

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-5 space-y-4 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment terms</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Role / position</dt>
          <dd className="text-gray-900 dark:text-white font-medium">
            {record.role_title || (record.member_role_name || '').replace(/_/g, ' ')}
          </dd>
        </div>
        <div className="flex gap-2">
          <Calendar className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Assignment period</dt>
            <dd className="text-gray-900 dark:text-white">
              {fmtDate(record.assignment_start_date)} → {fmtDate(record.assignment_end_date)}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Time commitment</dt>
          <dd className="text-gray-900 dark:text-white">
            {record.time_commitment_pct != null ? `${record.time_commitment_pct}%` : '—'}
          </dd>
        </div>
        <div className="flex gap-2">
          <User className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Reporting to</dt>
            <dd className="text-gray-900 dark:text-white">
              {record.reporting_to?.full_name || record.reporting_to?.email || '—'}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Working arrangement</dt>
          <dd className="text-gray-900 dark:text-white capitalize">{record.working_arrangement || '—'}</dd>
        </div>
        {record.work_location ? (
          <div className="flex gap-2">
            <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Work location</dt>
              <dd className="text-gray-900 dark:text-white">{record.work_location}</dd>
            </div>
          </div>
        ) : null}
      </dl>
      {record.primary_responsibilities ? (
        <div className="flex gap-2">
          <ListChecks className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Primary responsibilities</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {record.primary_responsibilities}
            </dd>
          </div>
        </div>
      ) : null}
      {record.required_skills ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Required skills</dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{record.required_skills}</dd>
        </div>
      ) : null}
      {record.appointment_message ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Message from your lead</dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{record.appointment_message}</dd>
        </div>
      ) : null}
    </div>
  )
}
