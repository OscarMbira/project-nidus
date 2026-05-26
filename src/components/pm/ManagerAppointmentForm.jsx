import { useEffect, useState } from 'react'
import SmartAmountInput from '../ui/SmartAmountInput'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import {
  REPORTING_FREQUENCY_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
} from '../../utils/appointmentRoleUtils'

const EMPTY = {
  assignmentStartDate: '',
  assignmentEndDate: '',
  timeCommitmentPct: 100,
  reportingToUserId: '',
  budgetAuthorityLimit: null,
  authorityNotes: '',
  reportingFrequency: 'weekly',
  knownConstraints: '',
  referenceDocument: '',
  appointmentMessage: '',
}

/**
 * PMO manager appointment terms (v593).
 * @param {{ value?: object, onChange: (v: object) => void, eligibleUsers?: Array, storageKey?: string }} props
 */
export default function ManagerAppointmentForm({
  value = EMPTY,
  onChange,
  eligibleUsers = [],
  storageKey = 'nidus-manager-appt-draft',
  defaultReportingToUserId = '',
}) {
  const [form, setForm] = useState({ ...EMPTY, ...value })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw && !value?.assignmentStartDate) {
        const parsed = JSON.parse(raw)
        setForm((f) => ({ ...f, ...parsed }))
        onChange?.({ ...EMPTY, ...parsed })
      }
    } catch {
      /* ignore */
    }
  }, [storageKey])

  // Apply default when the field is empty OR the stored ID isn't in the eligible list
  useEffect(() => {
    if (!defaultReportingToUserId) return
    const isValid = eligibleUsers.some((u) => u.id === form.reportingToUserId)
    if (!form.reportingToUserId || !isValid) {
      patch({ reportingToUserId: defaultReportingToUserId })
    }
  }, [defaultReportingToUserId, eligibleUsers])

  const patch = (partial) => {
    const next = { ...form, ...partial }
    setForm(next)
    onChange?.(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950/50 p-4 space-y-4">
      <p className="text-sm font-medium text-gray-900 dark:text-white">Formal appointment terms</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Assignment start date
          </label>
          <input
            type="date"
            value={form.assignmentStartDate}
            onChange={(e) => patch({ assignmentStartDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Assignment end date
          </label>
          <input
            type="date"
            value={form.assignmentEndDate}
            onChange={(e) => patch({ assignmentEndDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Time commitment %
          </label>
          <select
            value={form.timeCommitmentPct}
            onChange={(e) => patch({ timeCommitmentPct: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {TIME_COMMITMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Reporting to
          </label>
          <select
            value={form.reportingToUserId}
            onChange={(e) => patch({ reportingToUserId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value="">— Select —</option>
            {eligibleUsers.map((u, index) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Budget authority limit
          </label>
          <SmartAmountInput
            value={form.budgetAuthorityLimit}
            onChange={(n) => patch({ budgetAuthorityLimit: n })}
            enableShorthand
            convertOnEnter
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Reporting frequency
          </label>
          <select
            value={form.reportingFrequency}
            onChange={(e) => patch({ reportingFrequency: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {REPORTING_FREQUENCY_OPTIONS.map((o, index) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Authority notes
          </label>
          <textarea
            rows={2}
            value={form.authorityNotes}
            onChange={(e) => patch({ authorityNotes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            placeholder="Decision scope: team, scope, procurement…"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Known constraints
          </label>
          <textarea
            rows={2}
            value={form.knownConstraints}
            onChange={(e) => patch({ knownConstraints: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Reference document
          </label>
          <input
            type="text"
            value={form.referenceDocument}
            onChange={(e) => patch({ referenceDocument: e.target.value })}
            placeholder="Mandate / brief / PID reference"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Invitation message
          </label>
          <textarea
            rows={3}
            value={form.appointmentMessage}
            onChange={(e) => patch({ appointmentMessage: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>
    </div>
  )
}

export { EMPTY as MANAGER_APPOINTMENT_EMPTY }
