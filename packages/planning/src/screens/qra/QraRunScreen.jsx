/**
 * v1355 — run the analysis in a worker, then save it. A stored seed makes a re-run match.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FieldLabelWithHelp } from '@nidus/ui'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { buildAnalysisModel } from '../../engine/qra/model.js'
import { withExposure, startQraRun } from '../../engine/qra/index.js'
import { toEngineCalendar } from '../../services/scheduleData.js'
import { snapshotOf, calendarFromJson } from '../../services/qraData.js'
import { useQraProject } from './useQraProject.js'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

export default function QraRunScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ctx = useQraProject()
  const { showSuccess, modal } = useSuccessModal()
  const [iterations, setIterations] = useState(5000)
  const [seedText, setSeedText] = useState(params.get('seed') || '')
  const [basis, setBasis] = useState(params.get('basis') === 'post' ? 'post' : 'pre')
  const [targetDate, setTargetDate] = useState('')
  const [targetCost, setTargetCost] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [handle, setHandle] = useState(null)
  const help = ctx.isSim ? 'sim' : 'public'

  const confidence = ctx.settings?.target_confidence || 80

  const modelPreview = useMemo(() => {
    if (!ctx.projectId || ctx.schedule.loading) return null
    const calendar = toEngineCalendar(ctx.schedule.calendar, ctx.schedule.exceptions)
    return buildAnalysisModel({
      seed: Number(seedText) || 1,
      iterations,
      basis: ctx.scheduleOnly ? 'pre' : basis,
      projectStart: ctx.schedule.tasks.map((t) => t.planned_start_date).filter(Boolean).sort()[0],
      calendar,
      tasks: ctx.schedule.tasks,
      dependencies: ctx.schedule.dependencies,
      ranges: ctx.ranges,
      risks: ctx.risks,
      links: ctx.links,
      groups: ctx.groups,
      costLines: ctx.scheduleOnly ? [] : ctx.costs,
      includeRisks: !ctx.scheduleOnly,
      includeCost: !ctx.scheduleOnly,
      confidence,
      targetDate: targetDate || null,
      targetCost: targetCost === '' ? null : Number(targetCost),
      baseBudget: ctx.budget,
      contingencyHeld: ctx.held,
      defaultDistribution: ctx.settings?.default_distribution || 'triangular',
    })
  }, [ctx, iterations, seedText, basis, targetDate, targetCost, confidence])

  async function start() {
    setError(null)
    const seed = Number(seedText) || Math.floor(Math.random() * 0x7fffffff) + 1
    setSeedText(String(seed))
    const calendar = toEngineCalendar(ctx.schedule.calendar, ctx.schedule.exceptions)
    let model = buildAnalysisModel({
      ...(modelPreview || {}),
      seed,
      iterations,
      calendar,
      tasks: ctx.schedule.tasks,
      dependencies: ctx.schedule.dependencies,
      ranges: ctx.ranges,
      risks: ctx.risks,
      links: ctx.links,
      groups: ctx.groups,
      costLines: ctx.scheduleOnly ? [] : ctx.costs,
      includeRisks: !ctx.scheduleOnly,
      includeCost: !ctx.scheduleOnly,
    })
    model = withExposure(model, ctx.scheduleOnly ? [] : ctx.risks, model.bands)
    model.calendar = calendar
    const rerun = params.get('rerun')
    if (rerun) {
      const saved = await ctx.api.getRun(rerun)
      if (saved?.inputs_snapshot) {
        const snap = saved.inputs_snapshot
        model = { ...snap, calendar: calendarFromJson(snap.calendar), exposureByBasis: model.exposureByBasis, exposureRisks: ctx.risks, bands: model.bands }
      }
    }
    setProgress({ done: 0, total: model.iterations })
    const running = startQraRun(model, {
      onProgress: (done, total) => setProgress({ done, total }),
      onError: (err) => { setHandle(null); setError(err.message) },
      onDone: async (summary) => {
        setHandle(null)
        if (!summary) { setProgress(null); return }
        try {
          const saved = await ctx.api.saveRun({
            project_id: ctx.projectId,
            kind: model.kind,
            response_basis: model.basis,
            iterations: summary.iterations,
            seed: summary.seed,
            inputs_snapshot: snapshotOf(model),
            summary,
            task_stats: (summary.criticality || []).map((row) => ({
              task_id: row.taskId, task_label: row.label, criticality: row.criticality,
            })),
          })
          setProgress(null)
          showSuccess({
            recordId: saved?.display_id || saved?.id,
            operation: 'created',
            subject: 'analysis',
            message: 'The analysis has been saved. Running it again with the same repeat code gives the same result.',
            onOk: () => navigate(`../results/${saved.id}`),
          })
        } catch (err) {
          setError(err.message)
        }
      },
    })
    setHandle(running)
  }

  if (!ctx.projectId) return <p className="text-gray-700 dark:text-gray-200">Choose a project to run the analysis.</p>
  if (ctx.schedule.loading || ctx.loading) return <p className="text-gray-700 dark:text-gray-200">Loading the plan…</p>

  return (
    <div className="space-y-4 max-w-xl">
      {ctx.error && <p className="text-sm text-red-700 dark:text-red-300">{ctx.error}</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <div>
        <FieldLabelWithHelp helpKey={`${help}.qra_runs.iterations`} htmlFor="qra-iterations">Iterations</FieldLabelWithHelp>
        <select id="qra-iterations" className={inputClass} value={iterations} onChange={(e) => setIterations(Number(e.target.value))}>
          {[1000, 5000, 10000, 20000].map((n) => <option key={n} value={n}>{n.toLocaleString()}</option>)}
        </select>
      </div>
      {!ctx.scheduleOnly && (
        <div>
          <FieldLabelWithHelp helpKey={`${help}.qra_runs.response_basis`} htmlFor="qra-basis">Before or after response</FieldLabelWithHelp>
          <select id="qra-basis" className={inputClass} value={basis} onChange={(e) => setBasis(e.target.value)}>
            <option value="pre">Before response</option>
            <option value="post">After response</option>
          </select>
        </div>
      )}
      <div>
        <FieldLabelWithHelp helpKey={`${help}.qra_runs.seed`} htmlFor="qra-seed">Repeat code</FieldLabelWithHelp>
        <input id="qra-seed" className={inputClass} value={seedText} onChange={(e) => setSeedText(e.target.value)} inputMode="numeric" />
      </div>
      <div>
        <FieldLabelWithHelp helpKey={`${help}.tasks.planned_end_date`} htmlFor="qra-target-date">Target finish</FieldLabelWithHelp>
        <RegionalDateInput id="qra-target-date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>
      {!ctx.scheduleOnly && (
        <div>
          <FieldLabelWithHelp helpKey={`${help}.cost_line_ranges.ml_amount`} htmlFor="qra-target-cost" isAmount>Target budget</FieldLabelWithHelp>
          <input id="qra-target-cost" className={inputClass} value={targetCost} onChange={(e) => setTargetCost(e.target.value)} inputMode="decimal" />
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={start} disabled={Boolean(handle)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
          {handle ? 'Running…' : 'Run analysis'}
        </button>
        {handle && (
          <button type="button" data-help="exempt" onClick={() => { handle.cancel(); setHandle(null); setProgress(null) }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100">
            Cancel
          </button>
        )}
      </div>
      {progress && (
        <p className="text-sm text-gray-700 dark:text-gray-200" role="status">
          {progress.done.toLocaleString()} of {progress.total.toLocaleString()}
        </p>
      )}
      {modelPreview && <p className="text-sm text-gray-600 dark:text-gray-300">{modelPreview.tasks.length} tasks in this run.</p>}
      {modal}
    </div>
  )
}
