/**
 * Interfaces Section
 * Links to other projects/programmes/systems — multi-line list (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'

function InterfacesSectionBody({ formData, onChange, errors = {}, readOnly = false }) {
  const setListField = (name, value) => {
    onChange({ target: { name, value } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Interfaces
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Links to other projects, programmes, or systems. One interface per line.
        </p>
      </div>

      <div>
        <FieldLabelWithHelp helpKey="sim.project_briefs.interfaces" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project interfaces
        </FieldLabelWithHelp>
        <MultiLineListInput
          viewModeId="brief-project-interfaces"
          id="brief_interfaces"
          value={formData.interfaces || ''}
          onChange={(v) => setListField('interfaces', v)}
          placeholder="e.g. Payments switch — real-time transaction feed"
          ariaLabelPrefix="interface"
          itemColumnLabel="Interface"
          disabled={readOnly}
        />
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.project_briefs.interfaces',
]

export default function InterfacesSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <InterfacesSectionBody {...props} />
    </FieldHelpScope>
  )
}
