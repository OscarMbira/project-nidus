import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Loader2 } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import AiAssessmentCard from '../../components/sim/AiAssessmentCard'
import { generateDebrief } from '../../services/simAICoachService'
import { assessRun, getRunScore, listAssessments, listDifficultyLog, listMyFlags } from '../../services/sim/simAiAgentsService'

const BAND_LABEL = { struggling: 'Struggling', on_track: 'On track', excelling: 'Excelling' }

/**
 * Simulation debrief. v1272 Phase 3: the AI Assessor's run-end assessment (advisory unless the
 * scenario counts it), the AI debrief built from it, and the run's adaptive-difficulty history.
 */
export default function SimulationDebrief() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [score, setScore] = useState(null)
  const [runEnd, setRunEnd] = useState(null)
  const [decisionCount, setDecisionCount] = useState(0)
  const [flagged, setFlagged] = useState(new Set())
  const [difficulty, setDifficulty] = useState([])
  const [debrief, setDebrief] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const [{ data }, s, assessments, log, flags] = await Promise.all([
      simDb.from('simulation_runs').select('*').eq('id', runId).single(),
      getRunScore(runId).catch(() => null),
      listAssessments(runId).catch(() => []),
      listDifficultyLog(runId).catch(() => []),
      listMyFlags(runId).catch(() => []),
    ])
    setRun(data)
    setScore(s)
    setRunEnd(assessments.find((a) => a.assessment_point === 'run_end') || null)
    setDecisionCount(assessments.filter((a) => a.assessment_point === 'decision').length)
    setDifficulty(log)
    setFlagged(new Set(flags.map((f) => f.assessment_id)))
  }

  useEffect(() => { load() }, [runId])

  const runAssessment = async () => {
    setBusy('assess')
    setError('')
    try {
      setRunEnd(await assessRun(runId))
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const runDebrief = async () => {
    setBusy('debrief')
    setError('')
    try {
      const assessments = await listAssessments(runId)
      setDebrief(await generateDebrief(runId, run.user_id, {
        totalScore: score?.score ?? run.total_score ?? 0,
        decisions: (run.decisions_made || []).map((d) => d?.title || d?.text || String(d)).filter(Boolean),
        assessments: assessments.map((a) => ({ point: a.assessment_point, overall: a.overall_score, criteria: (a.criteria || []).map((c) => ({ criterion: c.title || c.criterion_key, level: c.level, reason: c.reason })) })),
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!run) return <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading…</div>

  const blended = score && Number(score.weight) > 0

  return (
    <div className="max-w-3xl mx-auto space-y-4 px-4 py-8">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to history
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulation debrief</h1>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
        <div className="text-base">Score: <strong>{score?.score ?? run.total_score ?? '—'}</strong>
          {blended && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(includes AI Assessor at {Number(score.weight)}%; rule-based score {score.base ?? '—'})</span>}
        </div>
        <div>Methodology: {run.methodology}</div>
        <div>Role: {String(run.user_role || '').replace(/_/g, ' ')}</div>
        {run.difficulty_level && <div>Difficulty at the end: level {run.difficulty_level} of 5</div>}
      </section>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">AI Assessor</h2>
        {runEnd ? (
          <AiAssessmentCard assessment={runEnd} flagged={flagged.has(runEnd.id)} />
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get an assessment of the whole run against this scenario's rubric{decisionCount ? ` (${decisionCount} decision${decisionCount === 1 ? '' : 's'} already reviewed)` : ''}.
            </p>
            <button type="button" onClick={runAssessment} disabled={busy === 'assess'}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy === 'assess' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Assess my run
            </button>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">Coach debrief</h2>
        {debrief ? (
          <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
            <p>{debrief.summary}</p>
            {debrief.strengths?.length > 0 && <div><p className="font-medium">Strengths</p><ul className="list-disc pl-5">{debrief.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>}
            {debrief.improvements?.length > 0 && <div><p className="font-medium">To improve</p><ul className="list-disc pl-5">{debrief.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>}
            {debrief.topTip && <p><span className="font-medium">Top tip:</span> {debrief.topTip}</p>}
          </div>
        ) : (
          <button type="button" onClick={runDebrief} disabled={busy === 'debrief'}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
            {busy === 'debrief' && <Loader2 className="h-4 w-4 animate-spin" />} Write my debrief
          </button>
        )}
      </section>

      {difficulty.length > 0 && (
        <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="font-semibold text-gray-900 dark:text-white">How the scenario adapted to you</h2>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {difficulty.map((d) => (
              <li key={d.id}>
                Day {d.sim_day ?? '—'}: {BAND_LABEL[d.band] || d.band} → level {d.previous_level ?? '—'} to {d.difficulty_level}
                {d.reason?.index != null && <span className="text-gray-500 dark:text-gray-400"> (performance {d.reason.index}/100)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
    </div>
  )
}
