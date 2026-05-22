import { useEffect, useState } from 'react'
import { TIME_COMMITMENT_OPTIONS, WORKING_ARRANGEMENT_OPTIONS } from '../../utils/appointmentRoleUtils'

const EMPTY = {
  roleTitle: '',
  assignmentStartDate: '',
  assignmentEndDate: '',
  timeCommitmentPct: 100,
  reportingToUserId: '',
  primaryResponsibilities: '',
  requiredSkills: '',
  workingArrangement: 'hybrid',
  workLocation: '',
  appointmentMessage: '',
}

export default function TeamMemberAppointmentForm({
  value = EMPTY,
  onChange,
  eligibleUsers = [],
  storageKey = 'nidus-team-appt-draft',
  defaultReportingToUserId = '',
}) {
  const [form, setForm] = useState({ ...EMPTY, ...value })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
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
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-gray-50 dark:bg-gray-950/50 p-4 space-y-4">
      <p className="text-sm font-medium text-gray-900 dark:text-white">Team assignment terms</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Role / position title
          </label>
          <input
            type="text"
            value={form.roleTitle}
            onChange={(e) => patch({ roleTitle: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            placeholder="e.g. Backend Developer"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start date</label>
          <input
            type="date"
            value={form.assignmentStartDate}
            onChange={(e) => patch({ assignmentStartDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End date</label>
          <input
            type="date"
            value={form.assignmentEndDate}
            onChange={(e) => patch({ assignmentEndDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Time commitment %</label>
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
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reporting to</label>
          <select
            value={form.reportingToUserId}
            onChange={(e) => patch({ reportingToUserId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            <option value="">— Select —</option>
            {eligibleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Working arrangement</label>
          <select
            value={form.workingArrangement}
            onChange={(e) => patch({ workingArrangement: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          >
            {WORKING_ARRANGEMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {(form.workingArrangement === 'onsite' || form.workingArrangement === 'hybrid') && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Work location</label>
            <input
              type="text"
              value={form.workLocation}
              onChange={(e) => patch({ workLocation: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Primary responsibilities
          </label>
          <textarea
            rows={3}
            value={form.primaryResponsibilities}
            onChange={(e) => patch({ primaryResponsibilities: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Required skills</label>
          <textarea
            rows={2}
            value={form.requiredSkills}
            onChange={(e) => patch({ requiredSkills: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Invitation message</label>
          <textarea
            rows={2}
            value={form.appointmentMessage}
            onChange={(e) => patch({ appointmentMessage: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>
    </div>
  )
}

export { EMPTY as TEAM_MEMBER_APPOINTMENT_EMPTY }
