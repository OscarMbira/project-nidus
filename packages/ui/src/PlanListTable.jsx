/**
 * PlanListTable (2026-11-21) — a plan list (key risks, quality gates, budget breakdown, dependencies,
 * resource allocation) edited as a table instead of raw JSON. Wraps TableListInput (rule 67.1).
 * `value` is an array of row objects keyed by the list's columns (legacy JSON shapes are accepted and
 * read through rowsFromLegacyJson); onChange receives the new array. Columns come from PLAN_LISTS.
 */
import { useMemo } from 'react'
import TableListInput from './TableListInput'
import { joinTableValue, parseTableValue } from '@nidus/shared/utils/registerTableField'
import { planListConfig, rowsFromLegacyJson } from '@nidus/shared/services/planListTablesService'

export default function PlanListTable({ kind, listKey, value, onChange, disabled = false, ariaLabelPrefix }) {
  const cfg = planListConfig(kind, listKey)
  const columns = useMemo(
    () => (cfg?.columns || []).map((c) => ({ key: c.key, label: c.label, type: c.type, options: c.options })),
    [cfg],
  )
  const text = useMemo(() => {
    if (!cfg) return ''
    const rows = rowsFromLegacyJson(cfg, value)
    return joinTableValue(rows.map((r) => cfg.columns.map((c) => r[c.key] || '')))
  }, [cfg, value])

  if (!cfg) return null
  const handleChange = (next) => {
    const rows = parseTableValue(next, cfg.columns.length)
      .map((cells) => Object.fromEntries(cfg.columns.map((c, i) => [c.key, cells[i] || ''])))
    onChange?.(rows)
  }
  return (
    <TableListInput
      viewModeId={`plan-list-${kind}-${listKey}`}
      columns={columns}
      value={text}
      onChange={handleChange}
      disabled={disabled}
      ariaLabelPrefix={ariaLabelPrefix || listKey.replace(/_/g, ' ')}
    />
  )
}
