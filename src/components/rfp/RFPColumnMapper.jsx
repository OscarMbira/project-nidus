/**
 * RFPColumnMapper - Column mapping UI for non-standard CSV files
 * Maps CSV headers to DB fields
 */

import { memo, useCallback, useMemo } from 'react'

const DB_FIELDS = [
  { key: 'item_number', label: 'S/No (Item Number)', required: true },
  { key: 'reference_number', label: 'Reference/Identifier', required: false },
  { key: 'scope_entity', label: 'Scope', required: false },
  { key: 'business_area', label: 'Business Area', required: false },
  { key: 'description', label: 'Description', required: true },
  { key: 'vendor_response', label: 'Vendor Response/Comments', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'requirement_type', label: 'Requirement Type', required: false },
  { key: 'is_mandatory', label: 'Is Mandatory', required: false },
  { key: 'acceptance_criteria', label: 'Acceptance Criteria', required: false },
  { key: 'estimated_effort', label: 'Estimated Effort', required: false },
]

const ADDITIONAL_KEY = 'additional_columns'

function RFPColumnMapper({ headers = [], mapping = {}, onChange }) {
  const handleSelect = useCallback((dbField, csvHeader) => {
    const newMapping = { ...mapping }
    if (csvHeader) {
      newMapping[dbField] = csvHeader
    } else {
      delete newMapping[dbField]
    }
    onChange(newMapping)
  }, [mapping, onChange])

  const usedHeaders = useMemo(() => {
    const used = new Set()
    DB_FIELDS.forEach(({ key }) => {
      if (mapping[key]) used.add(mapping[key])
    })
    return used
  }, [mapping])

  const additionalColumns = useMemo(() => Array.isArray(mapping[ADDITIONAL_KEY]) ? mapping[ADDITIONAL_KEY] : [], [mapping])

  const unmappedHeaders = useMemo(() => headers.filter((h) => !usedHeaders.has(h)), [headers, usedHeaders])

  const handleAdditionalToggle = useCallback((header, included) => {
    const next = included
      ? [...additionalColumns, header]
      : additionalColumns.filter((x) => x !== header)
    onChange({ ...mapping, [ADDITIONAL_KEY]: next })
  }, [mapping, additionalColumns, onChange])

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">Map each CSV/Excel column to an RFP field:</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 text-gray-700 dark:text-gray-300">RFP Field</th>
              <th className="text-left py-2 text-gray-700 dark:text-gray-300">CSV Column</th>
            </tr>
          </thead>
          <tbody>
            {DB_FIELDS.map(({ key, label, required }) => (
              <tr key={key} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4">
                  <span className="text-gray-900 dark:text-white">{label}</span>
                  {required && <span className="text-red-500 ml-1">*</span>}
                </td>
                <td className="py-2">
                  <select
                    value={mapping[key] || ''}
                    onChange={(e) => handleSelect(key, e.target.value || null)}
                    className="w-full max-w-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">-- Not mapped --</option>
                    {headers.map((h) => (
                      <option key={h} value={h} disabled={mapping[key] !== h && usedHeaders.has(h)}>
                        {h}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unmappedHeaders.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional columns from file</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Include these columns to capture extra data from your Excel/CSV. They will be stored with each line item.</p>
          <div className="flex flex-wrap gap-3">
            {unmappedHeaders.map((h) => (
              <label key={h} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalColumns.includes(h)}
                  onChange={(e) => handleAdditionalToggle(h, e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{h}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(RFPColumnMapper)
