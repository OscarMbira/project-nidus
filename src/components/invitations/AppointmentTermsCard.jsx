import { Calendar, Briefcase, Percent, User, FileText, DollarSign } from 'lucide-react'
import { REPORTING_FREQUENCY_OPTIONS } from '../../utils/appointmentRoleUtils'

function fmtDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString()
}

function fmtMoney(n) {
  if (n == null || n === '') return '—'
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

/**
 * Read-only PMO appointment terms (v593).
 * @param {{ record: object, className?: string }} props
 */
export default function AppointmentTermsCard({ record, className = '' }) {
  if (!record) return null
  const freq = REPORTING_FREQUENCY_OPTIONS.find((o) => o.value === record.reporting_frequency)?.label

  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-5 space-y-4 ${className}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appointment terms</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="flex gap-2">
          <Briefcase className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Role</dt>
            <dd className="text-gray-900 dark:text-white capitalize">
              {(record.manager_role_name || '').replace(/_/g, ' ')}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Calendar className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Assignment period</dt>
            <dd className="text-gray-900 dark:text-white">
              {fmtDate(record.assignment_start_date)} → {fmtDate(record.assignment_end_date)}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <Percent className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Time commitment</dt>
            <dd className="text-gray-900 dark:text-white">
              {record.time_commitment_pct != null ? `${record.time_commitment_pct}%` : '—'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <User className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Reporting to</dt>
            <dd className="text-gray-900 dark:text-white">
              {record.reporting_to?.full_name || record.reporting_to?.email || '—'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2">
          <DollarSign className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Budget authority limit</dt>
            <dd className="text-gray-900 dark:text-white">{fmtMoney(record.budget_authority_limit)}</dd>
          </div>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Reporting frequency</dt>
          <dd className="text-gray-900 dark:text-white">{freq || record.reporting_frequency || '—'}</dd>
        </div>
      </dl>
      {record.authority_notes ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Authority notes</dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{record.authority_notes}</dd>
        </div>
      ) : null}
      {record.known_constraints ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Known constraints</dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{record.known_constraints}</dd>
        </div>
      ) : null}
      {record.reference_document ? (
        <div className="flex gap-2">
          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Reference document</dt>
            <dd className="text-sm text-gray-800 dark:text-gray-200">{record.reference_document}</dd>
          </div>
        </div>
      ) : null}
      {record.appointment_message ? (
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Personal message</dt>
          <dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{record.appointment_message}</dd>
        </div>
      ) : null}
    </div>
  )
}
