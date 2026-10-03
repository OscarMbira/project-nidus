/**
 * Interfaces Section
 * Links to other projects/programmes/systems — multi-line list (rule 67).
 */

import MultiLineListInput from '@nidus/ui/MultiLineListInput'

export default function InterfacesSection({ formData, onChange, errors = {}, readOnly = false }) {
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Project interfaces
        </label>
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
