/**
 * v1354 — scenario limits, rules, run, compare (up to four), approval and apply.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { SmartAmountInput } from '@nidus/ui'
import DashboardStatCard from '@nidus/ui/DashboardStatCard'
import AuthorisationRequestModal from '@nidus/ui/AuthorisationRequestModal'
import { useConfirmDialog } from '@nidus/ui/ConfirmDialog.jsx'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createPortfolioOptData } from '../../services/portfolioOptData.js'
import { optimisePortfolio } from '../../engine/portfolioOptimiser.js'
import { projectScore } from '../../engine/portfolioScoring.js'

const HELP = ['public.portfolio_scenarios.name', 'public.portfolio_scenarios.max_start_shift', 'public.portfolio_scenarios.limits', 'public.portfolio_scenario_rules.rule_type']
const input = 'w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'

export default function PortfolioScenarioScreen({ base = '/platform/portfolio' }) {
  const { portfolioKey, scenarioKey } = useParams()
  const creating = scenarioKey === 'new'
  const navigate = useNavigate()
  const { isSim } = usePlanning()
  const api = useMemo(() => createPortfolioOptData(isSim), [isSim])
  const { showSuccess, modal } = useSuccessModal()
  const [portfolios, setPortfolios] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [compare, setCompare] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (portfolioKey) return undefined
    api.listPortfolios().then(setPortfolios).catch((err) => setError(err.message))
    return undefined
  }, [api, portfolioKey])

  useEffect(() => {
    if (!portfolioKey) return undefined
    let cancel = false
    api.portfolioByKey(portfolioKey).then(async (row) => {
      if (!row) { if (!cancel) setError('That portfolio was not found.'); return }
      const list = await api.listScenarios(row.id)
      if (cancel) return
      setPortfolio(row)
      setScenarios(list)
    }).catch((err) => { if (!cancel) setError(err.message) })
    return () => { cancel = true }
  }, [api, portfolioKey])

  return (
    <FieldHelpScope helpKeys={HELP}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back</button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Portfolio scenarios</h1>
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {!portfolioKey && portfolios.map((p) => (
          <p key={p.id}><Link className="text-blue-700 dark:text-blue-300 underline" to={`${base}/scenarios/${p.portfolio_code || p.id}`}>{p.portfolio_name}</Link></p>
        ))}
        {portfolio && !scenarioKey && (
          <div className="space-y-3">
            <Link to={`${base}/scenarios/${portfolio.portfolio_code || portfolio.id}/new`} className="inline-block px-3 py-1.5 rounded bg-blue-600 text-white text-sm">New scenario</Link>
            <ul className="space-y-1">
              {scenarios.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" aria-label={`Compare ${s.name}`} checked={compare.includes(s.id)} onChange={() => setCompare((ids) => ids.includes(s.id) ? ids.filter((id) => id !== s.id) : ids.length >= 4 ? ids : [...ids, s.id])} />
                  <Link className="text-blue-700 dark:text-blue-300 underline" to={`${base}/scenarios/${portfolio.portfolio_code || portfolio.id}/${s.display_id || s.id}`}>{s.name}</Link>
                  <span className="text-gray-700 dark:text-gray-200">{s.status} · {s.total_score ?? '—'}</span>
                </li>
              ))}
            </ul>
            {compare.length > 1 && <Compare api={api} ids={compare} scenarios={scenarios} />}
          </div>
        )}
        {portfolio && (scenarioKey || creating) && scenarioKey && (
          <ScenarioEditor api={api} portfolio={portfolio} scenarioKey={creating ? null : scenarioKey} base={base} onSaved={(row) => {
            showSuccess({ recordId: row.display_id || row.id, operation: row.justCreated ? 'created' : 'updated', subject: 'Scenario', onOk: () => navigate(`${base}/scenarios/${portfolio.portfolio_code || portfolio.id}/${row.display_id || row.id}`) })
          }} />
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}

function Compare({ api, ids, scenarios }) {
  const [rows, setRows] = useState([])
  useEffect(() => {
    Promise.all(ids.map(async (id) => {
      const results = await api.resultsOf(id)
      const scenario = scenarios.find((s) => s.id === id)
      const limits = Array.isArray(scenario?.limits) ? scenario.limits : []
      return { name: scenario?.name || id, score: scenario?.total_score, cost: limits.reduce((s, p) => s + Number(p.budget || 0), 0), inCount: results.filter((r) => r.included).length, outCount: results.filter((r) => !r.included).length }
    })).then(setRows)
  }, [api, ids, scenarios])
  return (
    <table className="min-w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-700"><tr>{['Scenario', 'Score', 'Budget limit', 'In', 'Out'].map((h) => <th key={h} data-help="exempt" className="px-2 py-2 text-left text-gray-700 dark:text-gray-200">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
            <td className="px-2 py-2">{r.name}</td><td className="px-2 py-2">{r.score ?? '—'}</td><td className="px-2 py-2">{r.cost}</td><td className="px-2 py-2">{r.inCount}</td><td className="px-2 py-2">{r.outCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ScenarioEditor({ api, portfolio, scenarioKey, base, onSaved }) {
  const [scenario, setScenario] = useState(null)
  const [name, setName] = useState('')
  const [shift, setShift] = useState(0)
  const [periods, setPeriods] = useState([{ id: 'period-1', label: 'Period 1', budget: 0, capacity: 0 }])
  const [projects, setProjects] = useState([])
  const [rules, setRules] = useState([])
  const [result, setResult] = useState(null)
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('details')
  const [decideOpen, setDecideOpen] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { confirm, dialog } = useConfirmDialog()
  const { showSuccess, modal } = useSuccessModal()
  const navigate = useNavigate()
  const locked = scenario && ['pending_approval', 'approved', 'applied'].includes(scenario.status)

  // v1359 (L4): Submit and Apply ask first, report errors, and confirm success (rule 16).
  const submitForApproval = async () => {
    if (!(await confirm({
      title: `Submit ${scenario.name} for approval?`,
      message: 'The scenario is locked while it waits. An approver accepts or rejects it, with a reason.',
      confirmLabel: 'Submit',
    }))) return
    setBusy(true); setError(null)
    try {
      await api.submit(scenario.id)
      setScenario({ ...scenario, status: 'pending_approval' })
      showSuccess({ recordId: scenario.display_id || scenario.name, operation: 'updated', subject: 'Scenario', message: 'Submitted for approval.' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const applyScenario = async () => {
    const included = (result?.chosen || []).length
    if (!(await confirm({
      title: `Apply ${scenario.name} to the portfolio?`,
      message: `This changes the portfolio itself: projects left out are set to not selected, the priority order follows the ranking${included ? ` (${included} projects selected)` : ''}, and shifted projects get new planned start dates. It cannot be undone automatically.`,
      confirmLabel: 'Apply to portfolio',
      danger: true,
    }))) return
    setBusy(true); setError(null)
    try {
      await api.apply(scenario.id)
      setScenario({ ...scenario, status: 'applied' })
      showSuccess({ recordId: scenario.display_id || scenario.name, operation: 'updated', subject: 'Scenario', message: 'Applied: project statuses, priority order and start dates were updated.' })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  useEffect(() => {
    let cancel = false
    api.projectsIn(portfolio.id).then(async (rows) => {
      const [criteria, scoreRows] = await Promise.all([api.criteria(portfolio.id), api.scores(portfolio.id)])
      const withHours = await Promise.all(rows.map(async (r) => {
        const mine = {}
        for (const s of scoreRows) if (s.project_id === r.projectId) mine[s.criterion_id] = s.score
        return { ...r, cost: Number(r.allocated_budget_from_portfolio) || 0, demand: await api.taskHours(r.projectId), score: projectScore(criteria, mine) }
      }))
      if (cancel) return
      setProjects(withHours)
      if (!scenarioKey) return
      const row = await api.scenarioByKey(portfolio.id, scenarioKey)
      if (!row || cancel) return
      setScenario(row)
      setName(row.name)
      setShift(row.max_start_shift || 0)
      setPeriods(Array.isArray(row.limits) && row.limits.length ? row.limits : [{ id: 'period-1', label: 'Period 1', budget: 0, capacity: 0 }])
      setRules(await api.rulesOf(row.id))
      const saved = await api.resultsOf(row.id)
      if (saved.length) {
        setResult({
          method: row.method,
          totalScore: Number(row.total_score) || 0,
          chosen: saved.filter((r) => r.included).map((r) => ({ projectId: r.project_id, shift: r.shift_periods, score: r.score })),
          leftOut: saved.filter((r) => !r.included).map((r) => ({ projectId: r.project_id, reason: r.reason })),
        })
      }
    }).catch((err) => setError(err.message))
    return () => { cancel = true }
  }, [api, portfolio.id, scenarioKey])

  const run = () => {
    const optimised = optimisePortfolio({
      maxShift: Number(shift) || 0,
      periods,
      rules: rules.map((r) => ({ type: r.rule_type, projectId: r.project_id, otherId: r.other_project_id })),
      projects: projects.map((p) => ({ id: p.projectId, name: p.project?.project_name || 'Project', score: Number(p.score) || 0, cost: Number(p.cost) || 0, demand: Number(p.demand) || 0 })),
    })
    setResult(optimised)
  }

  const persist = async (status) => {
    setBusy(true)
    setError(null)
    try {
      const results = result ? [
        ...result.chosen.map((c) => ({ project_id: c.projectId, included: true, shift_periods: c.shift, score: c.score, reason: null })),
        ...result.leftOut.map((c) => ({ project_id: c.projectId, included: false, shift_periods: 0, score: null, reason: c.reason })),
      ] : null
      const saved = await api.saveScenario({
        id: scenario?.id, portfolio_id: portfolio.id, name, max_start_shift: Number(shift) || 0, limits: periods,
        method: result?.method || null, total_score: result?.totalScore ?? null, status: status || scenario?.status || 'draft',
      }, rules, results)
      saved.justCreated = !scenario?.id
      setScenario(saved)
      onSaved(saved)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const rows = result ? [
    ...result.chosen.map((c) => ({ ...c, included: true, reason: '' })),
    ...result.leftOut.map((c) => ({ ...c, included: false })),
  ] : []
  const shown = rows.filter((r) => filter === 'all' || (filter === 'in' ? r.included : !r.included))

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <DetailAuditTabList activeTab={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'audit', label: 'Audit details' }]} />
      {tab === 'audit' ? (
        <AuditDetailsPanel>
          {!scenario ? <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p> : (
            <>
              <AuditCard title="Identity"><AuditField label="Scenario" value={scenario.name} /><AuditField label="ID" value={scenario.display_id} /></AuditCard>
              <AuditCard title="Classification"><AuditField label="Status" value={scenario.status} /><AuditField label="Method" value={scenario.method} /></AuditCard>
              <AuditCard title="Record history"><AuditField label="Created" value={scenario.created_at} /><AuditField label="Updated" value={scenario.updated_at} /><AuditField label="Justification" value={scenario.approval_notes} /></AuditCard>
            </>
          )}
        </AuditDetailsPanel>
      ) : (
        <fieldset disabled={locked} className="space-y-3">
          <label data-help="exempt" className="block max-w-md"><FieldLabelWithHelp helpKey="public.portfolio_scenarios.name" htmlFor="scenario-name" className="text-xs text-gray-600 dark:text-gray-400">Scenario name</FieldLabelWithHelp><input id="scenario-name" className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label data-help="exempt" className="block max-w-xs"><FieldLabelWithHelp helpKey="public.portfolio_scenarios.max_start_shift" htmlFor="scenario-shift" className="text-xs text-gray-600 dark:text-gray-400">Start later by (periods)</FieldLabelWithHelp><input id="scenario-shift" type="number" min={0} max={36} className={input} value={shift} onChange={(e) => setShift(e.target.value)} /></label>
          <FieldLabelWithHelp helpKey="public.portfolio_scenarios.limits" className="text-xs text-gray-600 dark:text-gray-400">Period limits</FieldLabelWithHelp>
          {periods.map((p, i) => (
            <div key={p.id || i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input data-help="exempt" aria-label="Period name" className={input} value={p.label} onChange={(e) => setPeriods((rows) => rows.map((r, j) => j === i ? { ...r, label: e.target.value, id: r.id || e.target.value } : r))} />
              <SmartAmountInput value={p.budget} ariaLabel="Period budget" onChange={(n) => setPeriods((rows) => rows.map((r, j) => j === i ? { ...r, budget: n || 0 } : r))} />
              <input data-help="exempt" aria-label="Period hours" type="number" className={input} value={p.capacity} onChange={(e) => setPeriods((rows) => rows.map((r, j) => j === i ? { ...r, capacity: Number(e.target.value) || 0 } : r))} />
            </div>
          ))}
          <button type="button" className="text-sm text-blue-700 dark:text-blue-300" onClick={() => setPeriods((rows) => [...rows, { id: `period-${rows.length + 1}`, label: `Period ${rows.length + 1}`, budget: 0, capacity: 0 }])}>Add period</button>
          <FieldLabelWithHelp helpKey="public.portfolio_scenario_rules.rule_type" className="text-xs text-gray-600 dark:text-gray-400">Rules</FieldLabelWithHelp>
          {rules.map((r, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select aria-label="Rule" className={input} value={r.rule_type} onChange={(e) => setRules((rows) => rows.map((row, j) => j === i ? { ...row, rule_type: e.target.value } : row))}>
                {['mandatory', 'excluded', 'requires', 'exclusive'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select aria-label="Project" className={input} value={r.project_id} onChange={(e) => setRules((rows) => rows.map((row, j) => j === i ? { ...row, project_id: e.target.value } : row))}>
                {projects.map((p) => <option key={p.projectId} value={p.projectId}>{p.project?.project_name}</option>)}
              </select>
              <select aria-label="Other project" className={input} value={r.other_project_id || ''} onChange={(e) => setRules((rows) => rows.map((row, j) => j === i ? { ...row, other_project_id: e.target.value || null } : row))}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.projectId} value={p.projectId}>{p.project?.project_name}</option>)}
              </select>
            </div>
          ))}
          <button type="button" className="text-sm text-blue-700 dark:text-blue-300" onClick={() => setRules((rows) => [...rows, { rule_type: 'mandatory', project_id: projects[0]?.projectId, other_project_id: null }])}>Add rule</button>
          <div className="text-sm text-gray-700 dark:text-gray-200">Each project’s cost starts from the portfolio allocation and its hours from the schedule. Change them before you run.</div>
          {projects.map((p) => (
            <div key={p.projectId} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <span className="text-sm text-gray-900 dark:text-gray-100">{p.project?.project_name}</span>
              <SmartAmountInput value={p.cost} ariaLabel={`Cost for ${p.project?.project_name || 'project'}`} onChange={(n) => setProjects((rows) => rows.map((r) => r.projectId === p.projectId ? { ...r, cost: n || 0 } : r))} />
              <input aria-label={`Hours for ${p.project?.project_name || 'project'}`} type="number" className={input} value={p.demand} onChange={(e) => setProjects((rows) => rows.map((r) => r.projectId === p.projectId ? { ...r, demand: Number(e.target.value) || 0 } : r))} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={run} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Run</button>
            <button type="button" disabled={busy || !name.trim()} onClick={() => persist()} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">Save</button>
          </div>
          {result && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">{result.method === 'exact' ? 'Exact result' : 'Ranked shortlist (too many projects for an exact search)'} · score {result.totalScore}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <DashboardStatCard label="In" value={result.chosen.length} onClick={() => setFilter('in')} />
                <DashboardStatCard label="Out" value={result.leftOut.length} onClick={() => setFilter('out')} />
                <DashboardStatCard label="Score" value={result.totalScore} />
                <DashboardStatCard label="Periods" value={periods.length} />
              </div>
              <table className="min-w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr>{['Project', 'In', 'Starts in period', 'Why out'].map((h) => <th key={h} data-help="exempt" className="px-2 py-2 text-left text-gray-700 dark:text-gray-200">{h}</th>)}</tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.projectId} className="border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                      <td className="px-2 py-2">{projects.find((p) => p.projectId === r.projectId)?.project?.project_name || r.projectId}</td>
                      <td className="px-2 py-2">{r.included ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-2">{r.included ? (periods[r.shift]?.label || r.shift) : '—'}</td>
                      <td className="px-2 py-2">{r.reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>
      )}
      {scenario && !locked && <button type="button" disabled={busy} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50" onClick={submitForApproval}>Submit for approval</button>}
      {scenario?.status === 'pending_approval' && <button type="button" className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm" onClick={() => setDecideOpen(true)}>Decide</button>}
      {scenario?.status === 'approved' && <button type="button" disabled={busy} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50" onClick={applyScenario}>Apply</button>}
      {scenario && <button type="button" className="ml-2 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100" onClick={async () => {
        const copy = await api.saveScenario({ portfolio_id: portfolio.id, name: `${scenario.name} copy`, max_start_shift: scenario.max_start_shift, limits: scenario.limits, status: 'draft' }, rules, null)
        navigate(`${base}/scenarios/${portfolio.portfolio_code || portfolio.id}/${copy.display_id || copy.id}`)
      }}>Copy</button>}
      <AuthorisationRequestModal open={decideOpen} mode="decide" onClose={() => setDecideOpen(false)} onDecision={async (decision, notes) => {
        await api.decide(scenario.id, decision === 'approve' ? 'approve' : 'reject', notes)
        setScenario({ ...scenario, status: decision === 'approve' ? 'approved' : 'rejected', approval_notes: notes })
        setDecideOpen(false)
      }} />
      {dialog}
      {modal}
    </div>
  )
}
