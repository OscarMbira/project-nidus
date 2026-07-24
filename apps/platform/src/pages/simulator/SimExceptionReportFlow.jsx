import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { handleToleranceBreach } from '../../services/sim/simRunStateService'

export default function SimExceptionReportFlow() {
  const { runId } = useParams()
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')
  const acknowledge = async () => {
    await handleToleranceBreach(runId, false)
    setMsg('Tolerance flag cleared (stub). Add exception artefact workflow here.')
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Exception report</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">Acknowledge tolerance breaches and document recovery options.</p>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full rounded border border-gray-600 bg-transparent p-2 text-sm" placeholder="Situation, impact, options…" />
      <button type="button" className="rounded bg-amber-600 px-4 py-2 text-white" onClick={acknowledge}>
        Acknowledge & continue (stub)
      </button>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
    </div>
  )
}
