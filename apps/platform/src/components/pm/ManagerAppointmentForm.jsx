import { useEffect, useState } from 'react'
import SmartAmountInput from '../ui/SmartAmountInput'
import MultiLineListInput from '../project/MultiLineListInput'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  REPORTING_FREQUENCY_OPTIONS,
  TIME_COMMITMENT_OPTIONS,
} from '@nidus/shared/utils/appointmentRoleUtils'

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
  defaultAssignmentStartDate = '',
  defaultAssignmentEndDate = '',
  defaultBudgetAuthorityLimit = null,
}) {
  const [form, setForm] = useState({ ...EMPTY, ...value })

  // Sync out on every form change (functional setForm calls below can land in any order
  // within the same React commit — e.g. several defaults applying at once — so onChange and
  // the localStorage draft must be derived from the state React actually settles on, not
  // computed eagerly inside each individual patch() call).
  useEffect(() => {
    onChange?.(form)
    try {
      localStorage.setItem(storageKey, JSON.stringify(form))
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw && !value?.assignmentStartDate) {
        const parsed = JSON.parse(raw)
        setForm((f) => ({ ...f, ...parsed }))
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

  // Pre-fill assignment dates and budget authority from the selected project — only while the
  // field is still empty, so this never overwrites a value the PMO has already typed/restored.
  useEffect(() => {
    if (defaultAssignmentStartDate && !form.assignmentStartDate) {
      patch({ assignmentStartDate: defaultAssignmentStartDate })
    }
  }, [defaultAssignmentStartDate])

  useEffect(() => {
    if (defaultAssignmentEndDate && !form.assignmentEndDate) {
      patch({ assignmentEndDate: defaultAssignmentEndDate })
    }
  }, [defaultAssignmentEndDate])

  useEffect(() => {
    if (defaultBudgetAuthorityLimit != null && (form.budgetAuthorityLimit == null || form.budgetAuthorityLimit === '')) {
      patch({ budgetAuthorityLimit: defaultBudgetAuthorityLimit })
    }
  }, [defaultBudgetAuthorityLimit])

  const patch = (partial) => {
    setForm((prev) => ({ ...prev, ...partial }))
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
          <MultiLineListInput
            id="authority_notes_input"
            value={form.authorityNotes}
            onChange={(v) => patch({ authorityNotes: v })}
            placeholder="e.g. Decision scope: team, scope, procurement…"
            ariaLabelPrefix="authority note"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Known constraints
          </label>
          <MultiLineListInput
            id="known_constraints_input"
            value={form.knownConstraints}
            onChange={(v) => patch({ knownConstraints: v })}
            placeholder="e.g. Fixed go-live date…"
            ariaLabelPrefix="constraint"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Reference document
          </label>
          <MultiLineListInput
            id="reference_document_input"
            value={form.referenceDocument}
            onChange={(v) => patch({ referenceDocument: v })}
            placeholder="e.g. Mandate / brief / PID reference"
            ariaLabelPrefix="reference document"
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
