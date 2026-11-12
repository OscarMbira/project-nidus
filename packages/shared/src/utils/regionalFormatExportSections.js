/**
 * Project Regional & Format Settings — record export (rule 38.1): one Setting | Value | Project
 * Override table instead of a heading per setting and another per override flag.
 */

import { cellText, tableLines } from './recordExportHelpers'

/**
 * @param {{ key: string, label: string }[]} fields  settings in display order
 * @param {object} values  current setting values
 * @param {object} overrideFlags  { [key]: true } when the project overrides the organisation default
 * @returns {{ sections: object[], record: object }}
 */
export function buildRegionalFormatExport(fields = [], values = {}, overrideFlags = {}) {
  const table = {
    headers: ['Setting', 'Value', 'Project Override'],
    rows: fields.map((f) => [f.label || f.key, cellText(values[f.key]), overrideFlags[f.key] ? 'Yes' : 'No']),
  }
  return {
    sections: [
      {
        title: 'Regional & Format Settings',
        fields: [{ key: 'settings_table', label: 'Settings', table }],
      },
    ],
    record: { ...values, settings_table: tableLines(table) },
  }
}
