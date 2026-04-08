import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, AlertTriangle, Info, AlertCircle, ChevronRight } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getOrGenerateInsights, refreshInsights, getOrgInsightsEnabled } from '../../services/aiInsightsService'

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle,   color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',    border: 'border-red-200 dark:border-red-800' },
  warning:  { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
  info:     { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',  border: 'border-blue-200 dark:border-blue-800' },
}

/** Phase 6.3: Ask about this → opens widget pre-filled. Pass onAskAbout(insight.text) or use default: dispatch ai-widget-prefill. */
export default function AIInsightsPanel({ onAskAbout, orgId = null }) {
  const [insights,    setInsights]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [userId,      setUserId]      = useState(null)
  const [insightsEnabled, setInsightsEnabled] = useState(true)

  useEffect(() => {
    loadInsights()
  }, [orgId])

  const loadInsights = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const enabled = await getOrgInsightsEnabled(orgId)
      setInsightsEnabled(enabled)
      if (!enabled) {
        setInsights([])
        return
      }
      const data = await getOrGenerateInsights(user.id, orgId)
      setInsights(Array.isArray(data) ? data : [])
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!userId || refreshing) return
    setRefreshing(true)
    try {
      const data = await refreshInsights(userId, orgId)
      setInsights(Array.isArray(data) ? data : [])
    } finally {
      setRefreshing(false)
    }
  }

  const handleAskAbout = (text) => {
    if (onAskAbout) {
      onAskAbout(text)
    } else {
      window.dispatchEvent(new CustomEvent('ai-widget-prefill', { detail: { question: text } }))
    }
  }

  if (!insightsEnabled && !loading) return null

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today&apos;s Insights</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today's AI Insights</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Insight cards */}
      {insights.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
          No insights available. Click refresh to generate.
        </p>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, idx) => {
            const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info
            const Icon = cfg.icon
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                <p className="text-xs text-gray-700 dark:text-gray-200 flex-1">{insight.text}</p>
                <button
                  onClick={() => handleAskAbout(insight.text)}
                  className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 transition-colors"
                  title="Ask about this"
                >
                  Ask about this <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
        Rule-based from your data. Optional summary may use Google Gemini.
      </p>
    </div>
  )
}
