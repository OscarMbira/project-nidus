/**
 * PPTStylePreview — slide-carousel rendering of a record the way exportRecordToPPT would
 * lay it out (one slide per section, branded title bar + key-value body), for in-app "View"
 * (v853) rather than download. Reuses exportUtils.js's shared field-mapping helpers so
 * preview and export never diverge.
 */

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getNumberedSectionInfo,
  parseFieldValue,
  itemHasOwnListMarker,
  fieldGuidanceLines,
  resolveBranding,
} from '@nidus/shared/utils/exportUtils'

export default function PPTStylePreview({
  sections = [],
  record = {},
  baseFilename = 'Record',
  branding,
  blankPlaceholder = '—',
  attachmentAssets = {},
}) {
  const { footerText, headerHex } = resolveBranding(branding)

  const { titleInfo, contentSlides } = useMemo(() => {
    const { sectionTitles, flatNumberedFields } = getNumberedSectionInfo(sections)
    let flatIdx = 0
    const slides = []
    sections.forEach(({ title: sectionTitle, fields }, sIdx) => {
      if (!sectionTitle || !fields?.length) return
      const slideFields = fields.map((field) => {
        const numberedLabel = flatNumberedFields[flatIdx]?.label ?? (field.label || field.key)
        flatIdx += 1
        return { field, numberedLabel }
      })
      slides.push({ title: sectionTitles[sIdx], fields: slideFields })
    })
    const ref = record?.mandate_reference || record?.document_ref || record?.reference_number || record?.id || ''
    const title = record?.mandate_title || record?.report_title || record?.name || record?.title || baseFilename
    return { titleInfo: { title, ref }, contentSlides: slides }
  }, [sections, record, baseFilename])

  const totalSlides = 1 + contentSlides.length
  const [index, setIndex] = useState(0)
  useEffect(() => { setIndex(0) }, [sections, record])

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(totalSlides - 1, i + 1))
  const headerColor = `#${headerHex}`

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full aspect-video max-w-5xl rounded-lg shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
        {index === 0 ? (
          <div className="flex-1 flex flex-col justify-center px-10">
            <h1 className="text-2xl font-bold" style={{ color: headerColor }}>{titleInfo.title}</h1>
            {titleInfo.ref && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{titleInfo.ref}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Exported: {new Date().toLocaleDateString()}</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-3" style={{ backgroundColor: headerColor }}>
              <h2 className="text-white font-semibold text-sm">{contentSlides[index - 1].title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {contentSlides[index - 1].fields.map(({ field, numberedLabel }) => {
                const guidance = fieldGuidanceLines(field)
                const fieldAssets = attachmentAssets[field.key]
                if (Array.isArray(fieldAssets)) {
                  return (
                    <div key={field.key}>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{numberedLabel}:</p>
                      {guidance.map((line, i) => (
                        <p key={i} className="text-[11px] italic text-gray-400 dark:text-gray-500">{line}</p>
                      ))}
                      {fieldAssets.length === 0 ? (
                        <p className="text-xs text-gray-600 dark:text-gray-400">{blankPlaceholder}</p>
                      ) : (
                        <div className="flex flex-wrap gap-4">
                          {fieldAssets.map((asset, i) => (
                            <div key={i} className="w-64">
                              {/^image\//.test(asset.mime_type) && asset.url ? (
                                <img
                                  src={asset.url}
                                  alt={asset.caption || asset.file_name}
                                  className="h-40 w-64 rounded border border-gray-200 object-cover p-0.5 dark:border-gray-700"
                                />
                              ) : null}
                              {/^image\//.test(asset.mime_type || '') ? (
                                asset.caption?.trim() ? (
                                  <p className="mt-1.5 truncate text-center text-[10px] italic text-gray-500 dark:text-gray-400">
                                    {asset.caption.trim()}
                                  </p>
                                ) : null
                              ) : (
                                <p className="mt-1.5 truncate text-center text-[10px] italic text-gray-500 dark:text-gray-400">
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
                const parsed = parseFieldValue(record[field.key])
                return (
                  <div key={field.key}>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{numberedLabel}:</p>
                    {guidance.map((line, i) => (
                      <p key={i} className="text-[11px] italic text-gray-400 dark:text-gray-500">{line}</p>
                    ))}
                    {parsed.isList ? (
                      parsed.items.length === 0 && !parsed.intro ? (
                        <p className="text-xs text-gray-600 dark:text-gray-400">{blankPlaceholder}</p>
                      ) : (
                        <div className="space-y-0.5">
                          {parsed.intro ? (
                            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {parsed.intro}
                            </p>
                          ) : null}
                          {parsed.items.length > 0 ? (
                            <ul
                              className={`text-xs text-gray-600 dark:text-gray-400 space-y-0.5 ${
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
                      <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {parsed.text || blankPlaceholder}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
        <div className="px-6 py-1 text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
          {footerText}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full ${i === index ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={index === totalSlides - 1}
          className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{index + 1} / {totalSlides}</span>
      </div>
    </div>
  )
}
