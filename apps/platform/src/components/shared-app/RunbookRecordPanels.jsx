/**
 * Data migration runbook panels on a register record page (v1337, stories 17–19). Identical file in
 * apps/platform and apps/simulator — only the service binding differs (rule 34.3).
 *   behaviour.type 'runbook'          → live run summary + ordered step list of this runbook
 *   behaviour.type 'runbook_progress' → progress of each runbook linked to this record (Mock Migrations)
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import RunbookSummaryPanel from '@nidus/ui/RunbookSummaryPanel'
import RunbookStepList from '@nidus/ui/RunbookStepList'
import { summariseRunbook, runbookProgressText } from '@nidus/shared/utils/runbookSummary'
import { refIds, recordRefLabel } from '@nidus/shared/utils/registerRecordRef'
import { resolveListColumns } from '@nidus/shared/utils/registerListColumns'
import { formatRegionalNumber } from '@nidus/shared/utils/formatRegionalSettings'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { listRecords } from '../../services/localRegisterRecordService'

const STEPS_KEY = 'fin_runbook_steps'
const RUNBOOK_KEY = 'fin_migration_runbook'

const pointsAt = (rec, fieldKey, id) => refIds(rec.field_values?.[fieldKey]).includes(id)
const optionLabels = (register, fieldKey) => Object.fromEntries(
  ((register?.fields || []).find((f) => f.field_key === fieldKey)?.dropdown_options || []).map((o) => [o.value, o.label]),
)

async function loadRegisterRecords(registerKey, projectId) {
  const reg = await getRegisterDefinition(registerKey)
  if (!reg.data) return { register: null, records: [], error: reg.error }
  const res = await listRecords(reg.data.id, { scopeLevel: 'project', scopeEntityId: projectId })
  return { register: reg.data, records: res.data || [], error: res.success ? null : res.error }
}

export default function RunbookRecordPanels({ register, record, basePath, settings }) {
  const type = register?.behaviour?.type
  const projectId = record?.record_project_id
  const active = (type === 'runbook' || type === 'runbook_progress') && Boolean(projectId)
  const key = active ? `${type}|${record.id}|${projectId}|${record.updated_at || ''}` : null
  const [state, setState] = useState({ forKey: null })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    const load = async () => {
      const steps = await loadRegisterRecords(STEPS_KEY, projectId)
      if (type === 'runbook') {
        return { steps, mine: steps.records.filter((s) => pointsAt(s, 'runbook', record.id)) }
      }
      const runbooks = await loadRegisterRecords(RUNBOOK_KEY, projectId)
      const linked = runbooks.records.filter((r) => pointsAt(r, 'mock_migration', record.id))
      return {
        steps,
        runbooks: linked.map((r) => ({ record: r, summary: summariseRunbook(steps.records.filter((s) => pointsAt(s, 'runbook', r.id))) })),
        error: runbooks.error,
      }
    }
    load().then((data) => { if (!cancelled) setState({ forKey: key, ...data }) })
      .catch((e) => { if (!cancelled) setState({ forKey: key, error: e?.message || 'Could not load the runbook' }) })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null
  if (state.forKey !== key) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading runbook…</p>
  const error = state.error || state.steps?.error
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>

  const stepsRegister = state.steps?.register
  const formatNumber = (n) => formatRegionalNumber(n, { ...(settings || {}), decimal_places: 0 })
  const windowLabels = optionLabels(stepsRegister, 'window')

  if (type === 'runbook') {
    return (
      <div className="space-y-4">
        <RunbookSummaryPanel
          summary={summariseRunbook(state.mine, { windowLabels })}
          varianceLabel={(stepsRegister?.fields || []).find((f) => f.field_key === 'budget_variance_minutes')?.field_label}
          formatNumber={formatNumber}
        />
        <RunbookStepList
          steps={state.mine}
          hrefFor={(id) => `${basePath}/local-registers/${STEPS_KEY}/${id}`}
          statusLabels={Object.fromEntries((stepsRegister?.status_workflow || []).map((s) => [s.key, s.label]))}
          windowLabels={windowLabels}
          batchLabels={optionLabels(stepsRegister, 'batch')}
          columns={resolveListColumns(stepsRegister)}
          formatNumber={formatNumber}
          settings={settings}
        />
      </div>
    )
  }

  return (
    <section aria-label="Runbooks" className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">Runbooks</h2>
      {state.runbooks.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No runbook is linked to this run yet.</p>
      ) : (
        <ul className="space-y-2">
          {state.runbooks.map(({ record: r, summary }) => {
            const pct = summary.total ? Math.round(((summary.done + summary.skipped) / summary.total) * 100) : 0
            return (
              <li key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Link to={`${basePath}/local-registers/${RUNBOOK_KEY}/${r.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {recordRefLabel(r)}
                  </Link>
                  <span className="text-gray-600 dark:text-gray-400">
                    {runbookProgressText(summary)}{summary.successPercent !== null ? ` · ${summary.successPercent}% loaded` : ''}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${recordRefLabel(r)} progress`}>
                  <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
