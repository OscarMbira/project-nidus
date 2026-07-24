/**
 * SimAIWorkspaceDebrief.jsx (Phase 7.8)
 * Centre panel: debrief narrative, run selector, export PDF/Word. Chat mode for follow-up (simplified).
 */

import { useState } from 'react'
import { FileDown, FileText, Lightbulb, Star, TrendingUp, TrendingDown } from 'lucide-react'

export default function SimAIWorkspaceDebrief({
  debrief,
  runId,
  runSummary,
  pastDebriefs = [],
  onRunSelect,
  onExportPdf,
  onExportWord,
}) {
  const [chatInput, setChatInput] = useState('')
  const content = debrief?.content || debrief

  if (!debrief && !runSummary) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">Select a debrief from the left or complete a simulation.</p>
      </div>
    )
  }

  const pctMatch =
    typeof content?.summary === 'string' ? content.summary.match(/(\d+)%/) : null
  const score = runSummary?.total_score ?? (pctMatch ? parseInt(pctMatch[1], 10) : 0)
  const scoreColor = (s) => (s >= 80 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : 'text-red-500')

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
      {/* Run selector */}
      {pastDebriefs.length > 1 && (
        <div className="p-3 border-b border-gray-700 flex items-center gap-2">
          <label className="text-xs text-gray-400">Run:</label>
          <select
            value={runId || ''}
            onChange={(e) => onRunSelect?.(e.target.value)}
            className="text-sm bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-gray-200"
          >
            {pastDebriefs.map((d) => (
              <option key={d.id} value={d.run_id || d.id}>
                {d.created_at ? new Date(d.created_at).toLocaleString() : d.id?.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {runSummary && (
          <p className={`text-2xl font-bold ${scoreColor(runSummary.total_score)}`}>
            Score: {runSummary.total_score ?? 0}%
          </p>
        )}
        {content?.summary && (
          <p className="text-sm text-gray-300">{content.summary}</p>
        )}
        {content?.strengths?.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Strengths
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
              {content.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {content?.improvements?.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Areas to improve
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
              {content.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {content?.topTip && (
          <div className="flex gap-2 p-3 bg-purple-900/20 rounded-lg border border-purple-700/50">
            <Lightbulb className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-200"><strong>Key takeaway:</strong> {content.topTip}</p>
          </div>
        )}
      </div>

      {/* Export + follow-up placeholder */}
      <div className="p-3 border-t border-gray-700 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onExportPdf?.(content)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200"
        >
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button
          type="button"
          onClick={() => onExportWord?.(content)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200"
        >
          <FileText className="w-3.5 h-3.5" /> Word
        </button>
      </div>
    </div>
  )
}
