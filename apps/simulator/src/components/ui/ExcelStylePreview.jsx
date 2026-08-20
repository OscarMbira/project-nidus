/**
 * ExcelStylePreview — spreadsheet-styled rendering of a record the way exportRecordToExcel
 * would lay it out (field labels as column headers, one data row), for in-app "View" (v853)
 * rather than download. Multi-value fields render one item per line within the cell, matching
 * the real export's Alt+Enter-per-line convention (CLAUDE.md rule 38.5).
 */

import { getNumberedSectionInfo, guidedCellValue, resolveBranding } from '@nidus/shared/utils/exportUtils'

export default function ExcelStylePreview({
  sections = [],
  record = {},
  branding,
  blankPlaceholder = '—',
}) {
  const { headerHex } = resolveBranding(branding)
  const { flatNumberedFields } = getNumberedSectionInfo(sections)
  const headerColor = `#${headerHex}`

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            {flatNumberedFields.map((f) => (
              <th
                key={f.key}
                className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: headerColor }}
              >
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white dark:bg-gray-900">
            {flatNumberedFields.map((f) => {
              const cell = guidedCellValue(f, record[f.key], blankPlaceholder)
              const lines = String(cell).split('\n')
              return (
                <td
                  key={f.key}
                  className="px-3 py-2 align-top border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 min-w-[160px]"
                >
                  {lines.map((line, i) => (
                    <div key={i}>{line || ' '}</div>
                  ))}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
