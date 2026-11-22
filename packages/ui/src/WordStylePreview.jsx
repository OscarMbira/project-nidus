/**
 * WordStylePreview — styled-HTML rendering of a record the way exportRecordToWord would
 * lay it out (section = H1, Detail | Value tables, # | Item tables for lists), for in-app
 * "View" (v853) rather than download. Reuses exportUtils.js helpers so preview and export
 * never diverge (rule 38.1).
 */

import {
  getNumberedSectionInfo,
  parseFieldValue,
  itemHasOwnListMarker,
  fieldGuidanceLines,
  resolveBranding,
  sectionRenderSteps,
  factsTable,
  resolveLayoutFieldTable,
  fieldTable,
} from '@nidus/shared/utils/exportUtils'

function PreviewTable({ table, headerColor }) {
  if (!table?.headers?.length || !table?.rows?.length) return null
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-sm border-collapse border border-gray-200 dark:border-gray-700">
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            {table.headers.map((h) => (
              <th
                key={h}
                className="text-left text-white font-semibold px-2 py-1.5 border border-gray-200 dark:border-gray-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="bg-white dark:bg-gray-900">
              {table.headers.map((_, ci) => (
                <td
                  key={ci}
                  className="px-2 py-1.5 align-top whitespace-pre-wrap border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                >
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function WordStylePreview({
  sections = [],
  record = {},
  baseFilename = 'Record',
  branding,
  blankPlaceholder = '—',
  attachmentAssets = {},
}) {
  const { footerText, headerHex } = resolveBranding(branding)
  const headerColor = `#${headerHex}`
  const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections)
  const exportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  let flatIdx = 0

  return (
    <div className="mx-auto w-full max-w-4xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-10">
      <h1 className="text-2xl font-bold mb-1">{baseFilename.replace(/_/g, ' ')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">As of {exportDate}</p>

      {sections.map((section, sIdx) => {
        if (!section?.title || !section?.fields?.length) return null
        const steps = sectionRenderSteps(section.fields, flatIdx)
        flatIdx += section.fields.length
        return (
          <div key={sIdx} className="mb-6">
            <h2
              className="text-base font-bold text-white px-3 py-2 mb-3 rounded-sm"
              style={{ backgroundColor: headerColor }}
            >
              {sectionTitles[sIdx]}
            </h2>
            {steps.map((step, stepIdx) => {
              if (step.facts) {
                return (
                  <PreviewTable
                    key={`facts-${stepIdx}`}
                    table={factsTable(step.facts, record, flatNumberedFields, blankPlaceholder)}
                    headerColor={headerColor}
                  />
                )
              }
              const { field, index } = step
              const numberedLabel = flatNumberedFields[index]?.label ?? (field.label || field.key)
              const guidance = fieldGuidanceLines(field)
              const fieldAssets = attachmentAssets[field.key]
              if (Array.isArray(fieldAssets)) {
                return (
                  <div key={field.key} className="mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{numberedLabel}</h3>
                    {guidance.map((line, i) => (
                      <p key={i} className="text-xs italic text-gray-500 dark:text-gray-400">{line}</p>
                    ))}
                    {fieldAssets.length === 0 ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{blankPlaceholder}</p>
                    ) : (
                      <div className="space-y-4">
                        {fieldAssets.map((asset, i) => (
                          <div key={i}>
                            {/^image\//.test(asset.mime_type) && asset.url ? (
                              <img
                                src={asset.url}
                                alt={asset.caption || asset.file_name}
                                className="max-h-[420px] max-w-full rounded border border-gray-200 p-0.5 dark:border-gray-700"
                              />
                            ) : null}
                            {/^image\//.test(asset.mime_type || '') ? (
                              asset.caption?.trim() ? (
                                <p className="mt-2.5 text-center text-xs italic text-gray-500 dark:text-gray-400">
                                  {asset.caption.trim()}
                                </p>
                              ) : null
                            ) : (
                              <p className="mt-2.5 text-center text-xs italic text-gray-500 dark:text-gray-400">
                                {asset.file_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              const layoutTable = resolveLayoutFieldTable(field, record[field.key])
              const parsed = parseFieldValue(record[field.key])
              return (
                <div key={field.key} className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{numberedLabel}</h3>
                  {guidance.map((line, i) => (
                    <p key={i} className="text-xs italic text-gray-500 dark:text-gray-400">{line}</p>
                  ))}
                  {layoutTable ? (
                    <>
                      {parsed?.isList && parsed.intro && !fieldTable(field) ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                          {parsed.intro}
                        </p>
                      ) : null}
                      <PreviewTable table={layoutTable} headerColor={headerColor} />
                    </>
                  ) : parsed.isList ? (
                    parsed.items.length === 0 && !parsed.intro ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{blankPlaceholder}</p>
                    ) : (
                      <div className="space-y-1">
                        {parsed.intro ? (
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {parsed.intro}
                          </p>
                        ) : null}
                        {parsed.items.length > 0 ? (
                          <ul
                            className={`text-sm text-gray-700 dark:text-gray-300 space-y-1 ${
                              parsed.items.some((item) => itemHasOwnListMarker(item))
                                ? 'list-none pl-0'
                                : 'list-disc list-inside'
                            }`}
                          >
                            {parsed.items.map((item, i) => (
                              <li key={i} className="whitespace-pre-wrap">{item || blankPlaceholder}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {parsed.text || blankPlaceholder}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
        {footerText}
      </p>
    </div>
  )
}
