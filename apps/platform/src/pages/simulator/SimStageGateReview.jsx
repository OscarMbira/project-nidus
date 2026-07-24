import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadCompliance, recordBoardDecision, createStageGateReview } from '../../services/sim/simStageGateService'

export default function SimStageGateReview() {
  const { runId, stageName } = useParams()
  const [report, setReport] = useState(null)
  const load = async () => {
    const from = stageName || 'initiation'
    const to = from === 'initiation' ? 'planning' : from === 'planning' ? 'execution' : 'closure'
    const res = await loadCompliance(runId, from, to, 'traditional')
    setReport(res)
  }

  useEffect(() => {
    if (runId) load()
  }, [runId, stageName])

  const submitBoard = async (decision) => {
    const c = await createStageGateReview(runId, stageName || 'initiation', 'end_stage')
    if (!c.success || !c.data?.id) return
    await recordBoardDecision(c.data.id, decision, 80, { note: 'v505 stub decision' })
    load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Stage gate review</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">Gate {stageName}</p>
      {report && (
        <ul className="space-y-2">
          {(report.missing || []).map((m, i) => (
            <li key={i} className={`rounded border px-3 py-2 text-sm ${m.is_mandatory ? 'border-red-400/50' : 'border-amber-400/40'}`}>
              {m.description} {m.is_mandatory ? '(required)' : '(optional)'}
            </li>
          ))}
          {report.canAdvance && <li className="text-green-600 text-sm">All mandatory requirements satisfied.</li>}
        </ul>
      )}
      <div className="flex gap-2 flex-wrap">
        <button type="button" className="rounded bg-gray-700 px-3 py-2 text-white text-sm" onClick={() => load()}>
          Refresh checklist
        </button>
        <button type="button" className="rounded bg-green-600 px-3 py-2 text-white text-sm" onClick={() => submitBoard('authorized')}>
          Submit — board authorizes (stub)
        </button>
      </div>
    </div>
  )
}
