import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Star, TrendingUp, TrendingDown, Lightbulb, RotateCcw, ChevronDown, ChevronUp, Loader2, ExternalLink, FileDown } from 'lucide-react'
import { generateDebrief, getPastDebriefs } from '../../services/simAICoachService'
import { supabase } from '../../services/supabaseClient'

/**
 * SimAIDebrief — post-simulation AI debrief screen (Phase 7.4).
 * "View in AI Workspace →" opens /simulator/ai?debrief=<id>. Export debrief as PDF.
 *
 * Props:
 *   runId        {string}   - completed simulation run ID
 *   runData      {Object}   - { moduleScores, totalScore, decisions, elapsed }
 *   onReplay     {Function} - callback to restart simulation
 */
export default function SimAIDebrief({ runId, runData = {}, onReplay }) {
  const [debrief,      setDebrief]      = useState(null)
  const [debriefId,    setDebriefId]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [pastDebriefs, setPastDebriefs] = useState([])
  const [showPast,     setShowPast]     = useState(false)
  const [userId,       setUserId]       = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    init()
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setLoading(true)
    try {
      const result = await generateDebrief(runId, user.id, runData)
      const clean = { ...result }
      delete clean._insertedId
      setDebrief(clean)
      const past = await getPastDebriefs(user.id)
      setPastDebriefs(past.slice(0, 5))
      const id = result._insertedId || past.find((p) => p.run_id === runId)?.id || past[0]?.id
      if (id) setDebriefId(id)
    } finally {
      setLoading(false)
    }
  }

  function exportDebriefPdf() {
    if (!debrief) return
    const score = runData?.totalScore ?? 0
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Simulation Debrief</title></head><body style="font-family:sans-serif;max-width:640px;margin:24px;">
<h1>Simulation Debrief</h1>
<p><strong>Score: ${score}%</strong></p>
${debrief.summary ? `<p>${debrief.summary}</p>` : ''}
${debrief.strengths?.length ? `<h2>Strengths</h2><ul>${debrief.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
${debrief.improvements?.length ? `<h2>Areas to Improve</h2><ul>${debrief.improvements.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}
${debrief.topTip ? `<p><strong>Key takeaway:</strong> ${debrief.topTip}</p>` : ''}
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.print(); w.close() }
  }

  const scoreColor = (score) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p className="text-sm">AI is generating your debrief...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Score banner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <Bot className="w-10 h-10 text-blue-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Simulation Debrief</h2>
        <p className={`text-4xl font-bold ${scoreColor(runData.totalScore || 0)} mb-3`}>
          {runData.totalScore || 0}%
        </p>
        {debrief?.summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300">{debrief.summary}</p>
        )}
      </div>

      {/* Module scores */}
      {runData.moduleScores && Object.keys(runData.moduleScores).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Module Scores</h3>
          <div className="space-y-2">
            {Object.entries(runData.moduleScores).map(([mod, score]) => (
              <div key={mod} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 dark:text-gray-300 w-32 truncate capitalize">{mod}</span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-10 text-right ${scoreColor(score)}`}>{score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {debrief?.strengths?.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">What You Did Well</h3>
          </div>
          <ul className="space-y-1">
            {debrief.strengths.map((s, i) => (
              <li key={i} className="text-xs text-green-700 dark:text-green-300 flex gap-2">
                <Star className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {debrief?.improvements?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">Areas to Improve</h3>
          </div>
          <ul className="space-y-1">
            {debrief.improvements.map((s, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex gap-2">
                <TrendingUp className="w-3 h-3 flex-shrink-0 mt-0.5 rotate-180 text-amber-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top tip */}
      {debrief?.topTip && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 flex gap-3">
          <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Key Takeaway</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">{debrief.topTip}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {debriefId && (
          <button
            onClick={() => navigate(`/simulator/ai?debrief=${debriefId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View in AI Workspace →
          </button>
        )}
        <button
          onClick={() => exportDebriefPdf()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FileDown className="w-4 h-4" /> Export debrief as PDF
        </button>
        {onReplay && (
          <button
            onClick={onReplay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Replay Simulation
          </button>
        )}
      </div>

      {/* Past debriefs */}
      {pastDebriefs.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Past Debriefs
            {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showPast && (
            <div className="px-4 pb-4 space-y-2">
              {pastDebriefs.slice(1).map((d) => (
                <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {d.content?.summary && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{d.content.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
