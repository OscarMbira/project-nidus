import { useState, useEffect, useCallback } from 'react'
import { Bot, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getRealtimeHint } from '../../services/simAICoachService'

/**
 * SimAICoach — real-time coaching hints panel for the Simulator.
 *
 * Props:
 *   runId         {string}   - current simulation run ID
 *   moduleId      {string}   - current module name
 *   triggerEvent  {string}   - one of: stage_entry | score_low | blank_field | idle | bad_decision
 *   currentScore  {number}   - 0–100
 *   enabled       {boolean}  - master toggle (from simulator settings)
 *   onAskCoach    {Function} - optional: opens the AI chat pre-filled with hint context
 */
export default function SimAICoach({
  runId,
  moduleId,
  triggerEvent,
  currentScore = 0,
  enabled = true,
  onAskCoach,
}) {
  const [hints,      setHints]      = useState([])   // queue of pending hints
  const [collapsed,  setCollapsed]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [userId,     setUserId]     = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Fire a new hint whenever triggerEvent changes
  useEffect(() => {
    if (!enabled || !triggerEvent || !runId || !userId) return
    fetchHint()
  }, [triggerEvent, runId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHint = useCallback(async () => {
    setLoading(true)
    try {
      const text = await getRealtimeHint(runId, userId, moduleId, triggerEvent, currentScore)
      if (text) {
        setHints((prev) => [...prev, { id: Date.now(), text, dismissed: false }])
      }
    } finally {
      setLoading(false)
    }
  }, [runId, userId, moduleId, triggerEvent, currentScore])

  const dismissHint = (id) => {
    setHints((prev) => prev.filter((h) => h.id !== id))
  }

  const visibleHints = hints.filter((h) => !h.dismissed)

  if (!enabled || visibleHints.length === 0) return null

  return (
    <div className="fixed bottom-24 left-4 z-40 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span className="text-xs font-semibold">Coach Hint</span>
          {visibleHints.length > 1 && (
            <span className="text-xs bg-blue-500 rounded-full px-1.5">{visibleHints.length}</span>
          )}
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-0.5 hover:bg-blue-700 rounded">
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Hints (show one at a time) */}
      {!collapsed && visibleHints.length > 0 && (
        <div className="p-3">
          <div className="flex gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 dark:text-gray-200 flex-1">
              {visibleHints[0].text}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 gap-2">
            {onAskCoach && (
              <button
                onClick={() => onAskCoach(visibleHints[0].text)}
                className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                title="Ask Coach about this"
              >
                Ask Coach about this →
              </button>
            )}
            <button
              onClick={() => dismissHint(visibleHints[0].id)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
          {visibleHints.length > 1 && (
            <p className="text-xs text-gray-400 text-center mt-2">{visibleHints.length - 1} more hints waiting</p>
          )}
        </div>
      )}

      {loading && !collapsed && (
        <div className="px-3 pb-2 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
          Coach is thinking...
        </div>
      )}
    </div>
  )
}
