import { useMemo } from 'react'
import FormSectionCard from './FormSectionCard'
import FormFieldRenderer from './FormFieldRenderer'
import DynamicTableSection from './DynamicTableSection'
import { calculateEvmMetrics, calculateRiskScore, calculateThreePointDuration } from '../../services/formCalculations'
import { buildTranslationIndex, resolveFieldLabel, resolveOptionLabel } from '@nidus/shared/utils/formTranslations'

import CalculatedMetricsSummary from '../ui/CalculatedMetricsSummary'

export default function DynamicFormRenderer({
  schema, values = {}, rows = {}, onValueChange, onRowsChange, translations = [], languageCode,
  showCalculated = false, errors = {},
}) {
  const calculated = useMemo(() => ({
    risk_score: calculateRiskScore(values.probability, values.impact),
    three_point_duration: calculateThreePointDuration(values.optimistic, values.most_likely, values.pessimistic),
    evm: calculateEvmMetrics(values),
  }), [values])

  const translationIndex = useMemo(
    () => buildTranslationIndex(translations, languageCode),
    [translations, languageCode],
  )

  return (
    <div className="space-y-4">
      {(schema?.sections || []).map((section) => (
        <FormSectionCard key={section.key} title={section.title}>
          {(section.fields || []).map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-300">
                {resolveFieldLabel(field, translationIndex, section.key)}
                {field.required && <span className="ml-0.5 text-red-500 dark:text-red-400">*</span>}
              </label>
              {field.help ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {field.help}
                </p>
              ) : null}
              <FormFieldRenderer
                field={field}
                value={values[field.key]}
                onChange={onValueChange}
                languageCode={languageCode}
                resolveOptionLabel={(opt) => resolveOptionLabel(opt, translationIndex, section.key, field.key)}
              />
              {errors[field.key] && (
                <p className="text-xs text-red-600 dark:text-red-400">{errors[field.key]}</p>
              )}
            </div>
          ))}
          {(section.tables || []).map((table) => (
            <DynamicTableSection key={table.key} sectionKey={table.key} rows={rows[table.key] || []} onChange={onRowsChange} />
          ))}
        </FormSectionCard>
      ))}
      {showCalculated && (
        <CalculatedMetricsSummary calculated={calculated} languageCode={languageCode} />
      )}
    </div>
  )
}
