import { DECLINE_REASON_OPTIONS } from '@nidus/shared/utils/appointmentRoleUtils'
import AppointmentTermsCard from './AppointmentTermsCard'
import TeamMemberTermsCard from './TeamMemberTermsCard'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'

/**
 * Acceptance / decline fields for formal appointment invitations.
 */
export default function AppointmentAcceptPanel({
  flowType,
  managerRecord,
  teamRecord,
  acceptance,
  onAcceptanceChange,
  declineReason,
  declineNote,
  onDeclineReasonChange,
  onDeclineNoteChange,
  showDeclineFields,
}) {
  const patch = (partial) => onAcceptanceChange?.({ ...acceptance, ...partial })

  return (
    <div className="space-y-4">
      {flowType === 'manager' && managerRecord ? (
        <AppointmentTermsCard record={managerRecord} />
      ) : null}
      {flowType === 'team' && teamRecord ? <TeamMemberTermsCard record={teamRecord} /> : null}

      {!showDeclineFields ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Your response</h4>
          <label data-help="exempt" className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!acceptance.availabilityConfirmed}
              onChange={(e) => patch({ availabilityConfirmed: e.target.checked })}
              className="mt-1 rounded border-gray-300 dark:border-gray-600"
            />
            I confirm I can start on the proposed date (or as agreed)
          </label>
          <div>
            <FieldLabelWithHelp helpKey="sim.manager_appointment_records.actual_start_date" htmlFor="fh-manager-appointment-records-actual-start-date" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Actual start date (if different)
            </FieldLabelWithHelp>
            <RegionalDateInput id="fh-manager-appointment-records-actual-start-date" eventStyle
              value={acceptance.actualStartDate || ''}
              onChange={(e) => patch({ actualStartDate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <label data-help="exempt" className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!acceptance.conflictOfInterest}
              onChange={(e) => patch({ conflictOfInterest: e.target.checked })}
              className="mt-1 rounded"
            />
            I declare a potential conflict of interest
          </label>
          {acceptance.conflictOfInterest ? (
            <textarea
              rows={2}
              value={acceptance.coiDetail || ''}
              onChange={(e) => patch({ coiDetail: e.target.value })}
              placeholder="Describe the conflict of interest"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          ) : null}
          <label data-help="exempt" className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={
                flowType === 'manager'
                  ? !!acceptance.capabilityAcknowledged
                  : !!acceptance.skillsAcknowledged
              }
              onChange={(e) =>
                patch(
                  flowType === 'manager'
                    ? { capabilityAcknowledged: e.target.checked }
                    : { skillsAcknowledged: e.target.checked },
                )
              }
              className="mt-1 rounded"
            />
            {flowType === 'manager'
              ? 'I acknowledge the required capability and experience for this role'
              : 'I confirm I have the required skills for this assignment'}
          </label>
          <div>
            <FieldLabelWithHelp helpKey="sim.manager_appointment_records.acceptance_conditions" htmlFor="fh-manager-appointment-records-acceptance-conditions" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Acceptance conditions (optional)
            </FieldLabelWithHelp>
            <textarea id="fh-manager-appointment-records-acceptance-conditions"
              rows={2}
              value={acceptance.acceptanceConditions || ''}
              onChange={(e) => patch({ acceptanceConditions: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <FieldLabelWithHelp helpKey="sim.manager_appointment_records.initial_observations" htmlFor="fh-manager-appointment-records-initial-observations" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Initial observations (optional)
            </FieldLabelWithHelp>
            <textarea id="fh-manager-appointment-records-initial-observations"
              rows={2}
              value={acceptance.initialObservations || ''}
              onChange={(e) => patch({ initialObservations: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <FieldLabelWithHelp helpKey="sim.manager_appointment_records.decline_reason" htmlFor="fh-manager-appointment-records-decline-reason" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Decline reason
            </FieldLabelWithHelp>
            <select id="fh-manager-appointment-records-decline-reason"
              value={declineReason}
              onChange={(e) => onDeclineReasonChange?.(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            >
              {DECLINE_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabelWithHelp helpKey="sim.manager_appointment_records.response_note" htmlFor="fh-manager-appointment-records-response-note" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Note for the appointer
            </FieldLabelWithHelp>
            <textarea id="fh-manager-appointment-records-response-note"
              rows={3}
              value={declineNote}
              onChange={(e) => onDeclineNoteChange?.(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
