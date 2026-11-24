/**
 * v1355 — three-point cost and schedule ranges on a risk, before or after the response.
 * The most likely value is also written to the single impact field so older screens keep working.
 */
import { useEffect, useState } from 'react'
import { FieldLabelWithHelp, SmartAmountInput } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import { scoreFromPercent } from '../../engine/qra/riskExposure.js'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

export default function QuantifiedRiskFields({ prefix = 'pre', values, onChange, helpTable = 'public.risks', projectId, db, showShape = true }) {
  const [groups, setGroups] = useState([])
  const key = (name) => `${helpTable}.${name}`
  const field = (suffix) => `${prefix}_${suffix}`

  useEffect(() => {
    if (!projectId || !db || !showShape) return undefined
    let cancelled = false
    db.from('qra_groups').select('id, name').eq('project_id', projectId).order('name')
      .then(({ data }) => { if (!cancelled) setGroups(data || []) })
      .catch(() => { if (!cancelled) setGroups([]) })
    return () => { cancelled = true }
  }, [projectId, db, showShape])

  function setPercent(raw) {
    onChange(field('probability_percent'), raw)
    const score = scoreFromPercent(raw)
    if (score) onChange(prefix === 'pre' ? 'pre_probability' : 'post_probability', score)
  }

  function setCostMl(value) {
    onChange(field('cost_ml'), value)
    onChange(prefix === 'pre' ? 'pre_cost_impact' : 'post_cost_impact', value ?? '')
  }

  function setDaysMl(value) {
    onChange(field('schedule_days_ml'), value)
    onChange(prefix === 'pre' ? 'pre_schedule_impact_days' : 'post_schedule_impact_days', value)
  }

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <FieldLabelWithHelp helpKey={key(`${prefix}_probability_percent`)} htmlFor={`${prefix}-prob`}>Probability %</FieldLabelWithHelp>
        <input id={`${prefix}-prob`} className={inputClass} inputMode="numeric" value={values[field('probability_percent')] ?? ''} onChange={(e) => setPercent(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Amount label="Cost minimum" helpKey={key(`${prefix}_cost_min`)} value={values[field('cost_min')]} onChange={(v) => onChange(field('cost_min'), v)} />
        <Amount label="Cost most likely" helpKey={key(`${prefix}_cost_ml`)} value={values[field('cost_ml')] ?? values[prefix === 'pre' ? 'pre_cost_impact' : 'post_cost_impact']} onChange={setCostMl} />
        <Amount label="Cost maximum" helpKey={key(`${prefix}_cost_max`)} value={values[field('cost_max')]} onChange={(v) => onChange(field('cost_max'), v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Day label="Days minimum" helpKey={key(`${prefix}_schedule_days_min`)} value={values[field('schedule_days_min')]} onChange={(v) => onChange(field('schedule_days_min'), v)} />
        <Day label="Days most likely" helpKey={key(`${prefix}_schedule_days_ml`)} value={values[field('schedule_days_ml')] ?? values[prefix === 'pre' ? 'pre_schedule_impact_days' : 'post_schedule_impact_days']} onChange={setDaysMl} />
        <Day label="Days maximum" helpKey={key(`${prefix}_schedule_days_max`)} value={values[field('schedule_days_max')]} onChange={(v) => onChange(field('schedule_days_max'), v)} />
      </div>
      {showShape && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FieldLabelWithHelp helpKey={key('impact_distribution')} htmlFor="qra-impact-shape">Impact shape</FieldLabelWithHelp>
            <select id="qra-impact-shape" className={inputClass} value={values.impact_distribution || 'triangular'} onChange={(e) => onChange('impact_distribution', e.target.value)}>
              <option value="triangular">Triangular</option>
              <option value="pert">PERT</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>
          <div>
            <FieldLabelWithHelp helpKey={key('qra_group_id')} htmlFor="qra-risk-group" listOptions={false}>Moves together with</FieldLabelWithHelp>
            <SelectField id="qra-risk-group" options={[{ value: '', label: 'On its own' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]} value={values.qra_group_id || ''} onChange={(value) => onChange('qra_group_id', value)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Amount({ label, helpKey, value, onChange }) {
  const numeric = value === '' || value == null ? null : Number(value)
  return (
    <div>
      <FieldLabelWithHelp helpKey={helpKey} isAmount>{label}</FieldLabelWithHelp>
      <SmartAmountInput value={Number.isFinite(numeric) ? numeric : null} onChange={(next) => onChange(next == null ? '' : next)} />
    </div>
  )
}

function Day({ label, helpKey, value, onChange }) {
  return (
    <div>
      <FieldLabelWithHelp helpKey={helpKey}>{label}</FieldLabelWithHelp>
      <input className={inputClass} inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
