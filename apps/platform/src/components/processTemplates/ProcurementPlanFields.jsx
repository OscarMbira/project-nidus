/**
 * Structured body of a Procurement Management Plan.
 * Stored on procurement_management_plans.document_data (no extra tables).
 */
import MultiLineListInput from '@nidus/ui/MultiLineListInput'

export const PROCUREMENT_PLAN_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'integration', label: 'Integration' },
  { value: 'timing', label: 'Timing' },
  { value: 'performance', label: 'Performance' },
  { value: 'roles', label: 'Roles' },
  { value: 'assumptions', label: 'Assumptions' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'audit', label: 'Audit details' },
]

const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

const INTEGRATION_ROWS = [
  ['scope', 'Scope'],
  ['schedule', 'Schedule'],
  ['documentation', 'Documentation'],
  ['risk', 'Risk'],
  ['reporting', 'Reporting'],
]

function blankActivity() {
  return { date: '', activity: '' }
}
function blankMetric() {
  return { item: '', metric: '', method: '' }
}
function blankRole() {
  return { role: '', responsibility: '', authority: '' }
}
function blankAssumption() {
  return { category: '', text: '' }
}

function padRows(rows, blank, minimum) {
  const list = Array.isArray(rows) ? rows.map((row) => ({ ...blank(), ...row })) : []
  while (list.length < minimum) list.push(blank())
  return list
}

export function emptyProcurementPlan() {
  return {
    planDate: '',
    integration: { scope: '', schedule: '', documentation: '', risk: '', reporting: '' },
    activities: padRows([], blankActivity, 3),
    metrics: padRows([], blankMetric, 3),
    roles: padRows([], blankRole, 2),
    assumptions: padRows([], blankAssumption, 2),
    legalJurisdiction: '',
    independentEstimates: '',
    riskManagement: '',
    prequalifiedSellers: '',
  }
}

export function normalizeProcurementPlan(data) {
  const base = emptyProcurementPlan()
  const source = data && typeof data === 'object' ? data : {}
  const integration = source.integration && typeof source.integration === 'object' ? source.integration : {}
  return {
    ...base,
    planDate: source.planDate || '',
    integration: { ...base.integration, ...integration },
    activities: padRows(source.activities, blankActivity, 1),
    metrics: padRows(source.metrics, blankMetric, 1),
    roles: padRows(source.roles, blankRole, 1),
    assumptions: padRows(source.assumptions, blankAssumption, 1),
    legalJurisdiction: source.legalJurisdiction || '',
    independentEstimates: source.independentEstimates || '',
    riskManagement: source.riskManagement || '',
    prequalifiedSellers: source.prequalifiedSellers || '',
  }
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {children}
    </section>
  )
}

function RowEditor({ columns, rows, onChange, readOnly, addLabel }) {
  const update = (index, key, value) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
  }
  const remove = (index) => {
    if (!window.confirm('Remove this row?')) return
    const next = rows.filter((_, i) => i !== index)
    onChange(next.length ? next : [{ ...columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {}) }])
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 w-10">#</th>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">{col.label}</th>
              ))}
              {!readOnly && <th className="px-3 py-2 w-16" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{index + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{row[col.key] || '—'}</span>
                    ) : (
                      <input
                        type={col.type || 'text'}
                        value={row[col.key] || ''}
                        onChange={(e) => update(index, col.key, e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => remove(index)} className="text-xs text-red-600 dark:text-red-400 hover:underline">
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onChange([...rows, columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})])}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {addLabel}
        </button>
      )}
    </div>
  )
}

function TextBlock({ label, value, onChange, readOnly, rows = 4 }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {readOnly ? (
        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value || '—'}</p>
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={inputClass} />
      )}
    </label>
  )
}

export default function ProcurementPlanFields({ value, onChange, readOnly = false, section = 'integration' }) {
  const plan = normalizeProcurementPlan(value)
  const patch = (partial) => onChange?.({ ...plan, ...partial })

  return (
    <div className="space-y-4">
      {section === 'integration' && (
      <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan date</span>
          {readOnly ? (
            <p className="text-sm text-gray-900 dark:text-gray-100">{plan.planDate || '—'}</p>
          ) : (
            <input type="date" value={plan.planDate} onChange={(e) => patch({ planDate: e.target.value })} className={inputClass} />
          )}
        </label>
      </div>

      <Section title="Procurement integration">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          How procured work stays aligned with the rest of the project.
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200 w-40">Area</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Integration approach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {INTEGRATION_ROWS.map(([key, label]) => (
                <tr key={key}>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{label}</td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      <span className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{plan.integration[key] || '—'}</span>
                    ) : (
                      <textarea
                        value={plan.integration[key] || ''}
                        onChange={(e) => patch({ integration: { ...plan.integration, [key]: e.target.value } })}
                        rows={2}
                        className={inputClass}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      </div>
      )}

      {section === 'timing' && (
      <Section title="Timing of key procurement activities">
        <RowEditor
          columns={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'activity', label: 'Activity' }]}
          rows={plan.activities}
          onChange={(activities) => patch({ activities })}
          readOnly={readOnly}
          addLabel="Add activity"
        />
      </Section>
      )}

      {section === 'performance' && (
      <Section title="Performance metrics">
        <RowEditor
          columns={[
            { key: 'item', label: 'Item' },
            { key: 'metric', label: 'Metric' },
            { key: 'method', label: 'Measurement method' },
          ]}
          rows={plan.metrics}
          onChange={(metrics) => patch({ metrics })}
          readOnly={readOnly}
          addLabel="Add metric"
        />
      </Section>
      )}

      {section === 'roles' && (
      <Section title="Roles, responsibility, and authority">
        <RowEditor
          columns={[
            { key: 'role', label: 'Role' },
            { key: 'responsibility', label: 'Responsibility' },
            { key: 'authority', label: 'Authority' },
          ]}
          rows={plan.roles}
          onChange={(roles) => patch({ roles })}
          readOnly={readOnly}
          addLabel="Add role"
        />
      </Section>
      )}

      {section === 'assumptions' && (
      <Section title="Assumptions and constraints">
        <RowEditor
          columns={[{ key: 'category', label: 'Category' }, { key: 'text', label: 'Assumption or constraint' }]}
          rows={plan.assumptions}
          onChange={(assumptions) => patch({ assumptions })}
          readOnly={readOnly}
          addLabel="Add assumption or constraint"
        />
      </Section>
      )}

      {section === 'commercial' && (
      <div className="space-y-6">
      <TextBlock
        label="Legal jurisdiction and currency"
        value={plan.legalJurisdiction}
        onChange={(legalJurisdiction) => patch({ legalJurisdiction })}
        readOnly={readOnly}
      />
      <TextBlock
        label="Independent estimates"
        value={plan.independentEstimates}
        onChange={(independentEstimates) => patch({ independentEstimates })}
        readOnly={readOnly}
      />
      <TextBlock
        label="Risk management"
        value={plan.riskManagement}
        onChange={(riskManagement) => patch({ riskManagement })}
        readOnly={readOnly}
      />
      <Section title="Prequalified sellers">
        <MultiLineListInput
          viewModeId="procurement-plan-prequalified-sellers"
          id="procurement-plan-sellers"
          value={plan.prequalifiedSellers}
          onChange={(prequalifiedSellers) => patch({ prequalifiedSellers })}
          itemColumnLabel="Seller"
          placeholder="Seller name"
          ariaLabelPrefix="seller"
          disabled={readOnly}
        />
      </Section>
      </div>
      )}
    </div>
  )
}
