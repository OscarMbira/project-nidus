import { useMemo } from 'react'
import FormSectionCard from './FormSectionCard'
import FormFieldRenderer from './FormFieldRenderer'
import DynamicTableSection from './DynamicTableSection'
import { calculateEvmMetrics, calculateRiskScore, calculateThreePointDuration } from '../../services/formCalculations'

export default function DynamicFormRenderer({ schema, values = {}, rows = {}, onValueChange, onRowsChange }) {
  const calculated = useMemo(() => ({
    risk_score: calculateRiskScore(values.probability, values.impact),
    three_point_duration: calculateThreePointDuration(values.optimistic, values.most_likely, values.pessimistic),
    evm: calculateEvmMetrics(values),
  }), [values])

  return (
    <div className="space-y-4">
      {(schema?.sections || []).map((section) => (
        <FormSectionCard key={section.key} title={section.title}>
          {(section.fields || []).map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-gray-300">{field.label}</label>
              <FormFieldRenderer field={field} value={values[field.key]} onChange={onValueChange} />
            </div>
          ))}
          {(section.tables || []).map((table) => (
            <DynamicTableSection key={table.key} sectionKey={table.key} rows={rows[table.key] || []} onChange={onRowsChange} />
          ))}
        </FormSectionCard>
      ))}
      <pre className="rounded bg-gray-950 p-3 text-xs text-gray-300">{JSON.stringify(calculated, null, 2)}</pre>
    </div>
  )
}
