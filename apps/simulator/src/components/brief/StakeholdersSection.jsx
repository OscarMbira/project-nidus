/**
 * Stakeholders Section
 * Users and interested parties — multi-line list (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function StakeholdersSectionBody({ formData, onChange, errors = {}, readOnly = false }) {
  const setListField = (name, value) => {
    onChange({ target: { name, value } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Users and interested parties
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Identify stakeholders who have an interest in the project. One party per line
          (include role and interest where known).
        </p>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.users_and_interested_parties" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Stakeholders
        </FieldLabelWithHelp>
        <MultiLineListInput
          viewModeId="brief-interested-parties"
          id="brief_users_and_interested_parties"
          value={formData.users_and_interested_parties || ''}
          onChange={(v) => setListField('users_and_interested_parties', v)}
          placeholder="e.g. Retail Operations — product acceptance and UAT"
          ariaLabelPrefix="stakeholder"
          itemColumnLabel="Stakeholder"
          disabled={readOnly}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_briefs.users_and_interested_parties',
]

export default function StakeholdersSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <StakeholdersSectionBody {...props} />
    </FieldHelpScope>
  )
}
