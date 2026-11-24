/**
 * v1354 — scoring criteria and the ranked list. Routes under portfolio/scoring.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createPortfolioOptData, SUGGESTED_CRITERIA } from '../../services/portfolioOptData.js'
import { projectScore, weightsAreValid } from '../../engine/portfolioScoring.js'

const HELP = ['public.portfolio_scoring_criteria.name', 'public.portfolio_scoring_criteria.weight_percent', 'public.portfolio_scoring_criteria.scale_guidance', 'public.portfolio_project_scores.score']
const input = 'w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'

export default function PortfolioScoringScreen({ base = '/platform/portfolio' }) {
  const { portfolioKey, projectKey } = useParams()
  const navigate = useNavigate()
  const { isSim } = usePlanning()
  const api = useMemo(() => createPortfolioOptData(isSim), [isSim])
  const { showSuccess, modal } = useSuccessModal()
  const [portfolios, setPortfolios] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [saved, setSaved] = useState('[]')
  const [projects, setProjects] = useState([])
  const [scoreRows, setScoreRows] = useState([])
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('details')
  const dirty = JSON.stringify(criteria) !== saved
  useUnsavedChangesGuard(dirty)

  useEffect(() => {
    if (portfolioKey) return undefined
    api.listPortfolios().then(setPortfolios).catch((err) => setError(err.message))
    return undefined
  }, [api, portfolioKey])

  useEffect(() => {
    if (!portfolioKey) return undefined
    let cancel = false
    api.portfolioByKey(portfolioKey).then(async (row) => {
      if (cancel || !row) { if (!cancel) setError('That portfolio was not found.'); return }
      const [c, p, s] = await Promise.all([api.criteria(row.id), api.projectsIn(row.id), api.scores(row.id)])
      if (cancel) return
      setPortfolio(row)
      setCriteria(c)
      setSaved(JSON.stringify(c))
      setProjects(p)
      setScoreRows(s)
    }).catch((err) => { if (!cancel) setError(err.message) })
    return () => { cancel = true }
  }, [api, portfolioKey])

  const save = async () => {
    if (!weightsAreValid(criteria)) { setError('Weights must be greater than 0 and total 100%.'); return }
    setError(null)
    try {
      await api.saveCriteria(portfolio.id, criteria)
      const next = await api.criteria(portfolio.id)
      setCriteria(next)
      setSaved(JSON.stringify(next))
      showSuccess({ recordId: portfolio.portfolio_code || portfolio.id, operation: 'updated', subject: 'Scoring criteria' })
    } catch (err) { setError(err.message) }
  }

  const ranked = useMemo(() => {
    const byProject = {}
    for (const row of scoreRows) {
      if (!byProject[row.project_id]) byProject[row.project_id] = {}
      byProject[row.project_id][row.criterion_id] = row.score
    }
    return projects.map((p) => ({
      name: p.project?.project_name || 'Project',
      code: p.project?.project_code || '',
      projectId: p.projectId,
      score: projectScore(criteria, byProject[p.projectId] || {}),
    })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  }, [projects, scoreRows, criteria])

  if (projectKey && portfolio) {
    return <ScoreProject api={api} portfolio={portfolio} projectKey={projectKey} criteria={criteria} base={base} />
  }

  return (
    <FieldHelpScope helpKeys={HELP}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back</button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Portfolio scoring</h1>
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {!portfolioKey && (
          <ul className="space-y-2">
            {portfolios.map((p) => (
              <li key={p.id}><Link className="text-blue-700 dark:text-blue-300 underline" to={`${base}/scoring/${p.portfolio_code || p.id}`}>{p.portfolio_name}</Link></li>
            ))}
            {portfolios.length === 0 && <li className="text-sm text-gray-700 dark:text-gray-200">No portfolios yet.</li>}
          </ul>
        )}
        {portfolio && (
          <>
            <DetailAuditTabList activeTab={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'audit', label: 'Audit details' }]} />
            {tab === 'audit' ? (
              <div className="mt-4">
                <AuditDetailsPanel>
                  <AuditCard title="Identity"><AuditField label="Portfolio" value={portfolio.portfolio_name} /><AuditField label="Code" value={portfolio.portfolio_code} /></AuditCard>
                  <AuditCard title="Classification"><AuditField label="Criteria" value={String(criteria.length)} /></AuditCard>
                  <AuditCard title="Record history"><AuditField label="Created" value={portfolio.created_at} /><AuditField label="Updated" value={portfolio.updated_at} /></AuditCard>
                </AuditDetailsPanel>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100" onClick={() => setCriteria(SUGGESTED_CRITERIA.map((c) => ({ ...c })))}>Use suggested criteria</button>
                  <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100" onClick={() => setCriteria((rows) => [...rows, { name: '', weight_percent: 0, scale_guidance: '', sort_order: rows.length + 1 }])}>Add criterion</button>
                  <button type="button" className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" onClick={save}>Save</button>
                </div>
                {criteria.map((c, i) => (
                  <div key={c.id || i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    <label data-help="exempt"><FieldLabelWithHelp helpKey="public.portfolio_scoring_criteria.name" className="text-xs text-gray-600 dark:text-gray-400">Criterion</FieldLabelWithHelp><input className={input} value={c.name} onChange={(e) => setCriteria((rows) => rows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} /></label>
                    <label data-help="exempt"><FieldLabelWithHelp helpKey="public.portfolio_scoring_criteria.weight_percent" className="text-xs text-gray-600 dark:text-gray-400">Weight %</FieldLabelWithHelp><input className={input} type="number" value={c.weight_percent} onChange={(e) => setCriteria((rows) => rows.map((r, j) => j === i ? { ...r, weight_percent: e.target.value } : r))} /></label>
                    <label data-help="exempt"><FieldLabelWithHelp helpKey="public.portfolio_scoring_criteria.scale_guidance" className="text-xs text-gray-600 dark:text-gray-400">What the scores mean</FieldLabelWithHelp><input className={input} value={c.scale_guidance || ''} onChange={(e) => setCriteria((rows) => rows.map((r, j) => j === i ? { ...r, scale_guidance: e.target.value } : r))} /></label>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-gray-900 dark:text-gray-100">Ranked projects</h2>
                  <ExportListMenu columns={[{ key: 'name', header: 'Project' }, { key: 'code', header: 'Code' }, { key: 'score', header: 'Score' }]} data={ranked} baseFilename="portfolio-scores" />
                </div>
                <table className="min-w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700"><tr><TableRowNumberHeader /><th data-help="exempt" className="px-2 py-2 text-left text-gray-700 dark:text-gray-200">Project</th><th data-help="exempt" className="px-2 py-2 text-left text-gray-700 dark:text-gray-200">Score</th></tr></thead>
                  <tbody>
                    {ranked.map((r, i) => (
                      <tr key={r.projectId} className="border-t border-gray-200 dark:border-gray-700">
                        <TableRowNumberCell number={getDisplayRowNumber(i)} />
                        <td className="px-2 py-2"><Link className="text-blue-700 dark:text-blue-300 underline" to={`${base}/scoring/${portfolio.portfolio_code || portfolio.id}/projects/${r.code || r.projectId}`}>{r.name}</Link></td>
                        <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{r.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}

function ScoreProject({ api, portfolio, projectKey, criteria, base }) {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [project, setProject] = useState(null)
  const [values, setValues] = useState({})
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('details')

  useEffect(() => {
    let cancel = false
    api.projectsIn(portfolio.id).then(async (rows) => {
      const row = rows.find((r) => r.project?.project_code === projectKey || r.projectId === projectKey)
      if (!row) { if (!cancel) setError('That project is not in this portfolio.'); return }
      const existing = await api.scores(portfolio.id)
      const prefill = await api.strategicPrefill(row.projectId)
      if (cancel) return
      const next = {}
      for (const c of criteria) {
        const found = existing.find((s) => s.project_id === row.projectId && s.criterion_id === c.id)
        if (found) next[c.id] = found.score
        else if (prefill && /strategic/i.test(c.name)) next[c.id] = prefill
      }
      setProject(row)
      setValues(next)
    }).catch((err) => setError(err.message))
    return () => { cancel = true }
  }, [api, portfolio.id, projectKey, criteria])

  const save = async () => {
    try {
      await api.saveScores(portfolio.id, project.projectId, values)
      showSuccess({ recordId: project.project?.project_code || project.projectId, operation: 'updated', subject: 'Project score' })
    } catch (err) { setError(err.message) }
  }

  return (
    <FieldHelpScope helpKeys={['public.portfolio_project_scores.score']}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <button type="button" onClick={() => navigate(`${base}/scoring/${portfolio.portfolio_code || portfolio.id}`)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back</button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{project?.project?.project_name || 'Score a project'}</h1>
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        <DetailAuditTabList activeTab={tab} onChange={setTab} tabs={[{ value: 'details', label: 'Details' }, { value: 'audit', label: 'Audit details' }]} />
        {tab === 'audit' ? <div className="mt-4"><p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p></div> : (
          <div className="mt-4 space-y-3 max-w-lg">
            {criteria.map((c) => (
              <label key={c.id} data-help="exempt" className="block">
                <FieldLabelWithHelp helpKey="public.portfolio_project_scores.score" className="text-xs text-gray-600 dark:text-gray-400">{c.name} ({c.weight_percent}%)</FieldLabelWithHelp>
                <select className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" value={values[c.id] || ''} onChange={(e) => setValues((v) => ({ ...v, [c.id]: Number(e.target.value) }))}>
                  <option value="">Choose</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {c.scale_guidance && <span className="text-xs text-gray-500 dark:text-gray-400">{c.scale_guidance}</span>}
              </label>
            ))}
            <button type="button" onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm">Save scores</button>
          </div>
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}
