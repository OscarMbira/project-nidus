/**
 * v1355 — task ranges, risk links, cost lines, groups and the confidence target.
 * Planner shows tasks and groups only.
 */
import { useEffect, useMemo, useState } from 'react'
import { FieldLabelWithHelp, RowActionButton, SmartAmountInput } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useConfirmDialog } from '@nidus/ui/ConfirmDialog.jsx'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { applyQuickRange, quantifiedProblem } from '../../engine/qra/riskExposure.js'
import { useQraProject } from './useQraProject.js'

const inputClass = 'w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'
const SECTIONS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'risks', label: 'Risks' },
  { id: 'costs', label: 'Costs' },
  { id: 'groups', label: 'Groups' },
  { id: 'settings', label: 'Settings' },
]

function blank(value) {
  return value == null || value === '' ? '' : String(value)
}
function num(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export default function QraInputsScreen() {
  const ctx = useQraProject()
  const help = ctx.isSim ? 'sim' : 'public'
  const { showSuccess, modal } = useSuccessModal()
  const { confirm, dialog } = useConfirmDialog()
  const [section, setSection] = useState('tasks')
  const [ranges, setRanges] = useState([])
  const [links, setLinks] = useState([])
  const [costs, setCosts] = useState([])
  const [groups, setGroups] = useState([])
  const [settings, setSettings] = useState({ target_confidence: 80, default_distribution: 'triangular' })
  const [lowPct, setLowPct] = useState('-10')
  const [highPct, setHighPct] = useState('25')
  const [groupName, setGroupName] = useState('')
  const [groupStrength, setGroupStrength] = useState('medium')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [snapshot, setSnapshot] = useState('')

  useEffect(() => {
    if (ctx.loading) return
    const nextRanges = (ctx.schedule.tasks || []).filter((t) => !t.is_summary).map((task) => {
      const saved = (ctx.ranges || []).find((r) => r.task_id === task.id)
      return {
        id: saved?.id,
        task_id: task.id,
        label: task.task_name || task.task_code || 'Task',
        point: task.estimated_duration_days,
        min_days: blank(saved?.min_days),
        ml_days: blank(saved?.ml_days ?? task.estimated_duration_days),
        max_days: blank(saved?.max_days),
        distribution: saved?.distribution || ctx.settings?.default_distribution || 'triangular',
        qra_group_id: saved?.qra_group_id || '',
      }
    })
    const nextLinks = (ctx.risks || []).map((risk) => ({
      risk_id: risk.id,
      title: risk.risk_title || risk.title || 'Risk',
      task_id: (ctx.links || []).find((l) => l.risk_id === risk.id)?.task_id || '',
    }))
    const nextCosts = (ctx.costs || []).map((row) => ({ ...row }))
    const nextSettings = {
      target_confidence: ctx.settings?.target_confidence || 80,
      default_distribution: ctx.settings?.default_distribution || 'triangular',
    }
    setRanges(nextRanges)
    setLinks(nextLinks)
    setCosts(nextCosts)
    setGroups(ctx.groups || [])
    setSettings(nextSettings)
    setSnapshot(JSON.stringify({ nextRanges, nextLinks, nextCosts, groups: ctx.groups || [], nextSettings }))
    setError(ctx.error)
  }, [ctx.loading, ctx.schedule.loading, ctx.ranges, ctx.links, ctx.risks, ctx.costs, ctx.groups, ctx.settings, ctx.schedule.tasks, ctx.error])

  const dirty = useMemo(() => {
    if (!snapshot) return false
    return snapshot !== JSON.stringify({ nextRanges: ranges, nextLinks: links, nextCosts: costs, groups, nextSettings: settings })
  }, [snapshot, ranges, links, costs, groups, settings])
  useUnsavedChangesGuard(dirty)

  function patchRange(taskId, patch) {
    setRanges((rows) => rows.map((row) => (row.task_id === taskId ? { ...row, ...patch } : row)))
  }

  function applyQuick() {
    setRanges((rows) => rows.map((row) => {
      if (row.point == null || row.point === '') return row
      const applied = applyQuickRange(row.point, lowPct, highPct)
      return { ...row, min_days: String(applied.min), ml_days: String(applied.ml), max_days: String(applied.max) }
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      for (const row of ranges) {
        const problem = quantifiedProblem(
          { min: row.min_days, ml: row.ml_days, max: row.max_days },
          { percentKey: 'none', minKey: 'min', mlKey: 'ml', maxKey: 'max' },
        )
        if (problem && problem !== 'Probability % must be from 1 to 99') throw new Error(`${row.label}: ${problem}`)
      }
      await ctx.api.saveRanges(ctx.projectId, ranges.map((row) => ({
        id: row.id, task_id: row.task_id,
        min_days: num(row.min_days), ml_days: num(row.ml_days), max_days: num(row.max_days),
        distribution: row.distribution, qra_group_id: row.qra_group_id || null,
      })))
      if (!ctx.scheduleOnly) {
        await ctx.api.replaceLinks(ctx.projectId, links.filter((l) => l.task_id).map((l) => ({ risk_id: l.risk_id, task_id: l.task_id })))
        const existing = costs.filter((row) => row.id || row.line_label)
        await ctx.api.saveCostLines(ctx.projectId, existing.map((row) => ({
          ...row,
          min_amount: num(row.min_amount),
          ml_amount: num(row.ml_amount),
          max_amount: num(row.max_amount),
          daily_rate: num(row.daily_rate),
        })))
      }
      const savedSettings = await ctx.api.saveSettings(ctx.projectId, settings)
      setSnapshot(JSON.stringify({ nextRanges: ranges, nextLinks: links, nextCosts: costs, groups, nextSettings: settings }))
      showSuccess({
        recordId: savedSettings?.id ? 'Settings' : 'Inputs',
        operation: 'updated',
        subject: 'analysis inputs',
        message: 'Task ranges, links and the confidence target are saved.',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function addGroup() {
    if (!groupName.trim()) return
    try {
      const saved = await ctx.api.saveGroup(ctx.projectId, { name: groupName, strength: groupStrength })
      setGroups((rows) => [...rows, saved].sort((a, b) => a.name.localeCompare(b.name)))
      setGroupName('')
      showSuccess({ recordId: saved.name, operation: 'created', subject: 'group', message: 'The group is saved. Assign it on a task, risk or cost line so those items move together.' })
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeCostLine(row) {
    if (!(await confirm({ title: 'Delete this cost line?', message: 'Its range and per-day setting are removed from the analysis inputs.', confirmLabel: 'Delete', danger: true }))) return
    try {
      await ctx.api.deleteCostLine(row.id)
      setCosts((rows) => rows.filter((item) => item.id !== row.id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeGroup(group) {
    if (!(await confirm({ title: `Delete the group ${group.name}?`, message: 'Items stay; they just leave the group.', confirmLabel: 'Delete group', danger: true }))) return
    try {
      await ctx.api.deleteGroup(group.id)
      setGroups((rows) => rows.filter((row) => row.id !== group.id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function copyBudget() {
    try {
      const lines = await ctx.api.listBudgetLines(ctx.projectId)
      if (!lines.length) {
        setError('This project has no plan budget lines to copy.')
        return
      }
      setCosts((rows) => [
        ...rows,
        ...lines.map((line) => ({
          line_label: line.category || line.notes || 'Budget line',
          source_kind: 'plan_budget',
          source_id: line.id,
          min_amount: '',
          ml_amount: line.amount,
          max_amount: '',
          distribution: settings.default_distribution,
          is_time_dependent: false,
          daily_rate: '',
          qra_group_id: '',
        })),
      ])
    } catch (err) {
      setError(err.message)
    }
  }

  if (!ctx.projectId && !ctx.idLoading) return <p className="text-gray-700 dark:text-gray-200">Choose a project to set up the analysis.</p>
  if (ctx.loading || ctx.schedule.loading || ctx.idLoading) return <p className="text-gray-700 dark:text-gray-200">Loading inputs…</p>

  const visible = SECTIONS.filter((item) => !ctx.scheduleOnly || (item.id !== 'risks' && item.id !== 'costs'))
  const taskOptions = ranges.map((row) => ({ value: row.task_id, label: row.label }))
  const groupOptions = [{ value: '', label: 'No group' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Input sections">
        {visible.map((item) => (
          <button key={item.id} type="button" data-help="exempt" onClick={() => setSection(item.id)} className={`px-3 py-1.5 rounded-lg text-sm ${section === item.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {section === 'tasks' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label data-help="exempt" className="text-sm text-gray-700 dark:text-gray-200">Quick range %
              <input aria-label="Low percent" className={`${inputClass} w-24 ml-2`} value={lowPct} onChange={(e) => setLowPct(e.target.value)} />
            </label>
            <label data-help="exempt" className="text-sm text-gray-700 dark:text-gray-200">to
              <input aria-label="High percent" className={`${inputClass} w-24 ml-2`} value={highPct} onChange={(e) => setHighPct(e.target.value)} />
            </label>
            <button type="button" data-help="exempt" onClick={applyQuick} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100">Apply to every task</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-2 py-2 text-left" data-help="exempt">Task</th>
                  <th className="px-2 py-2 text-left"><FieldLabelWithHelp helpKey={`${help}.task_duration_ranges.min_days`}>Minimum</FieldLabelWithHelp></th>
                  <th className="px-2 py-2 text-left"><FieldLabelWithHelp helpKey={`${help}.task_duration_ranges.ml_days`}>Most likely</FieldLabelWithHelp></th>
                  <th className="px-2 py-2 text-left"><FieldLabelWithHelp helpKey={`${help}.task_duration_ranges.max_days`}>Maximum</FieldLabelWithHelp></th>
                  <th className="px-2 py-2 text-left"><FieldLabelWithHelp helpKey={`${help}.task_duration_ranges.distribution`}>Shape</FieldLabelWithHelp></th>
                  <th className="px-2 py-2 text-left"><FieldLabelWithHelp helpKey={`${help}.task_duration_ranges.qra_group_id`} listOptions={false}>Group</FieldLabelWithHelp></th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((row) => (
                  <tr key={row.task_id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-2 text-gray-800 dark:text-gray-100">{row.label}</td>
                    <td className="px-2 py-2"><input aria-label={`${row.label} minimum`} className={inputClass} value={row.min_days} onChange={(e) => patchRange(row.task_id, { min_days: e.target.value })} /></td>
                    <td className="px-2 py-2"><input aria-label={`${row.label} most likely`} className={inputClass} value={row.ml_days} onChange={(e) => patchRange(row.task_id, { ml_days: e.target.value })} /></td>
                    <td className="px-2 py-2"><input aria-label={`${row.label} maximum`} className={inputClass} value={row.max_days} onChange={(e) => patchRange(row.task_id, { max_days: e.target.value })} /></td>
                    <td className="px-2 py-2">
                      <select aria-label={`${row.label} shape`} className={inputClass} value={row.distribution} onChange={(e) => patchRange(row.task_id, { distribution: e.target.value })}>
                        <option value="triangular">Triangular</option>
                        <option value="pert">PERT</option>
                        <option value="uniform">Uniform</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 min-w-[10rem]">
                      <SelectField id={`group-${row.task_id}`} aria-label={`${row.label} group`} options={groupOptions} value={row.qra_group_id} onChange={(value) => patchRange(row.task_id, { qra_group_id: value })} />
                    </td>
                  </tr>
                ))}
                {ranges.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-700 dark:text-gray-200">This project has no tasks yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'risks' && !ctx.scheduleOnly && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr><th className="px-3 py-2 text-left">Risk</th><th className="px-3 py-2 text-left">Task it delays</th></tr>
            </thead>
            <tbody>
              {links.map((row) => (
                <tr key={row.risk_id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2 text-gray-800 dark:text-gray-100">{row.title}</td>
                  <td className="px-3 py-2">
                    <FieldLabelWithHelp helpKey={`${help}.risk_task_links.task_id`} htmlFor={`link-${row.risk_id}`} listOptions={false}>Task</FieldLabelWithHelp>
                    <SelectField id={`link-${row.risk_id}`} forceSearchable options={[{ value: '', label: 'Whole project' }, ...taskOptions]} value={row.task_id} onChange={(value) => setLinks((rows) => rows.map((item) => item.risk_id === row.risk_id ? { ...item, task_id: value } : item))} />
                  </td>
                </tr>
              ))}
              {links.length === 0 && <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-700 dark:text-gray-200">No open risks. Add ranges on the risk itself, then link it here.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {section === 'costs' && !ctx.scheduleOnly && (
        <div className="space-y-3">
          {!ctx.isSim && <button type="button" data-help="exempt" onClick={copyBudget} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100">Copy plan budget lines</button>}
          {costs.map((row, index) => (
            <div key={row.id || index} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div>
                <FieldLabelWithHelp helpKey={`${help}.cost_line_ranges.line_label`} htmlFor={`cost-label-${index}`}>Line</FieldLabelWithHelp>
                <input id={`cost-label-${index}`} className={inputClass} value={row.line_label || ''} onChange={(e) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, line_label: e.target.value } : item))} />
              </div>
              <Amount label="Minimum" helpKey={`${help}.cost_line_ranges.min_amount`} value={row.min_amount} onChange={(value) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, min_amount: value } : item))} />
              <Amount label="Most likely" helpKey={`${help}.cost_line_ranges.ml_amount`} value={row.ml_amount} onChange={(value) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, ml_amount: value } : item))} />
              <Amount label="Maximum" helpKey={`${help}.cost_line_ranges.max_amount`} value={row.max_amount} onChange={(value) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, max_amount: value } : item))} />
              <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input id={`cost-time-${index}`} type="checkbox" checked={Boolean(row.is_time_dependent)} onChange={(e) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, is_time_dependent: e.target.checked } : item))} />
                <FieldLabelWithHelp helpKey={`${help}.cost_line_ranges.is_time_dependent`} htmlFor={`cost-time-${index}`}>Grows with delay</FieldLabelWithHelp>
              </div>
              {row.is_time_dependent && (
                <Amount label="Per day" helpKey={`${help}.cost_line_ranges.daily_rate`} value={row.daily_rate} onChange={(value) => setCosts((rows) => rows.map((item, i) => i === index ? { ...item, daily_rate: value } : item))} />
              )}
              {row.id && <RowActionButton variant="delete" label="Delete cost line" onClick={() => removeCostLine(row)} />}
            </div>
          ))}
          <button type="button" data-help="exempt" className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100" onClick={() => setCosts((rows) => [...rows, { line_label: '', min_amount: '', ml_amount: '', max_amount: '', distribution: settings.default_distribution, is_time_dependent: false, daily_rate: '' }])}>
            Add a cost line
          </button>
        </div>
      )}

      {section === 'groups' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <FieldLabelWithHelp helpKey={`${help}.qra_groups.name`} htmlFor="qra-group-name">Group name</FieldLabelWithHelp>
              <input id="qra-group-name" className={inputClass} value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <div>
              <FieldLabelWithHelp helpKey={`${help}.qra_groups.strength`} htmlFor="qra-group-strength">How strongly they move together</FieldLabelWithHelp>
              <select id="qra-group-strength" className={inputClass} value={groupStrength} onChange={(e) => setGroupStrength(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button type="button" onClick={addGroup} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Add group</button>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
                <span>{group.name} · {group.strength}</span>
                <RowActionButton variant="delete" label={`Delete ${group.name}`} onClick={() => removeGroup(group)} />
              </li>
            ))}
            {groups.length === 0 && <li className="px-3 py-4 text-sm text-gray-700 dark:text-gray-200">No groups yet. A group makes its members rise and fall together.</li>}
          </ul>
        </div>
      )}

      {section === 'settings' && (
        <div className="max-w-md space-y-3">
          <div>
            <FieldLabelWithHelp helpKey={`${help}.qra_settings.target_confidence`} htmlFor="qra-confidence">Target confidence</FieldLabelWithHelp>
            <select id="qra-confidence" className={inputClass} value={settings.target_confidence} onChange={(e) => setSettings((s) => ({ ...s, target_confidence: Number(e.target.value) }))}>
              <option value={50}>50%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>
          <div>
            <FieldLabelWithHelp helpKey={`${help}.qra_settings.default_distribution`} htmlFor="qra-shape">Default shape</FieldLabelWithHelp>
            <select id="qra-shape" className={inputClass} value={settings.default_distribution} onChange={(e) => setSettings((s) => ({ ...s, default_distribution: e.target.value }))}>
              <option value="triangular">Triangular</option>
              <option value="pert">PERT</option>
              <option value="uniform">Uniform</option>
            </select>
          </div>
        </div>
      )}

      {section !== 'groups' && (
        <button type="button" onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Save inputs'}
        </button>
      )}
      {modal}
      {dialog}
    </div>
  )
}

function Amount({ label, helpKey, value, onChange }) {
  return (
    <div>
      <FieldLabelWithHelp helpKey={helpKey} isAmount>{label}</FieldLabelWithHelp>
      <SmartAmountInput value={value === '' ? null : num(value)} onChange={(next) => onChange(next == null ? '' : next)} />
    </div>
  )
}
