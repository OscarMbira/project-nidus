import { useEffect, useState } from 'react'
import { TIME_COMMITMENT_OPTIONS, WORKING_ARRANGEMENT_OPTIONS } from '@nidus/shared/utils/appointmentRoleUtils'
import MultiLineListInput from '../project/MultiLineListInput'

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

const TABS = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'responsibilities', label: 'Responsibilities & skills' },
  { value: 'message', label: 'Invitation message' },
]

const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm'
const LABEL_CLASS = 'block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1'

export default function TeamMemberAppointmentForm({
  value = EMPTY,
  onChange,
  eligibleUsers = [],
  storageKey = 'nidus-team-appt-draft',
  defaultReportingToUserId = '',
}) {
  const [form, setForm] = useState({ ...EMPTY, ...value })
  const [activeTab, setActiveTab] = useState('assignment')

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
      <div role="tablist" aria-label="Team assignment sections" className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${
              activeTab === tab.value
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'assignment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={LABEL_CLASS}>Role / position title</label>
            <input
              type="text"
              value={form.roleTitle}
              onChange={(e) => patch({ roleTitle: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g. Backend Developer"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Start date</label>
            <input
              type="date"
              value={form.assignmentStartDate}
              onChange={(e) => patch({ assignmentStartDate: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>End date</label>
            <input
              type="date"
              value={form.assignmentEndDate}
              onChange={(e) => patch({ assignmentEndDate: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Time commitment %</label>
            <select
              value={form.timeCommitmentPct}
              onChange={(e) => patch({ timeCommitmentPct: Number(e.target.value) })}
              className={INPUT_CLASS}
            >
              {TIME_COMMITMENT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Reporting to</label>
            <select
              value={form.reportingToUserId}
              onChange={(e) => patch({ reportingToUserId: e.target.value })}
              className={INPUT_CLASS}
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
            <label className={LABEL_CLASS}>Working arrangement</label>
            <select
              value={form.workingArrangement}
              onChange={(e) => patch({ workingArrangement: e.target.value })}
              className={INPUT_CLASS}
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
              <label className={LABEL_CLASS}>Work location</label>
              <input
                type="text"
                value={form.workLocation}
                onChange={(e) => patch({ workLocation: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'responsibilities' && (
        <div className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Primary responsibilities</label>
            <MultiLineListInput
              viewModeId="team-appt-primary-responsibilities"
              id="team_appt_primary_responsibilities"
              value={form.primaryResponsibilities}
              onChange={(v) => patch({ primaryResponsibilities: v })}
              placeholder="e.g. Own the payments API integration…"
              ariaLabelPrefix="responsibility"
              itemColumnLabel="Responsibility"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Required skills</label>
            <MultiLineListInput
              viewModeId="team-appt-required-skills"
              id="team_appt_required_skills"
              value={form.requiredSkills}
              onChange={(v) => patch({ requiredSkills: v })}
              placeholder="e.g. Node.js, PostgreSQL…"
              ariaLabelPrefix="skill"
              itemColumnLabel="Skill"
            />
          </div>
        </div>
      )}

      {activeTab === 'message' && (
        <div>
          <label className={LABEL_CLASS}>Invitation message</label>
          <textarea
            rows={3}
            value={form.appointmentMessage}
            onChange={(e) => patch({ appointmentMessage: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
      )}
    </div>
  )
}

export { EMPTY as TEAM_MEMBER_APPOINTMENT_EMPTY }
