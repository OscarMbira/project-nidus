import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { validateReportCompleteness } from '../../../services/controllingStageService'

export default function HighlightReportCompletenessIndicator({ reportId }) {
  const [completeness, setCompleteness] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const rows = await validateReportCompleteness(reportId)
      const sections = Array.isArray(rows) ? rows : []
      const overall = sections.length
        ? sections.reduce((acc, s) => acc + (Number(s.completeness_percentage) || 0), 0) / sections.length
        : 0
      setCompleteness({
        sections,
        overallCompleteness: overall,
        isComplete: sections.every((s) => s.is_complete),
        canSubmit: overall >= 90
      })
    } catch (e) {
      console.warn('Validate completeness:', e)
      setCompleteness(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !completeness) return null

  const { sections, overallCompleteness, isComplete, canSubmit } = completeness

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-white">Report Completeness</h4>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {overallCompleteness.toFixed(0)}%
          </span>
          {isComplete ? (
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          )}
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all ${
            isComplete ? 'bg-green-600' : canSubmit ? 'bg-yellow-600' : 'bg-red-600'
          }`}
          style={{ width: `${Math.min(100, overallCompleteness)}%` }}
        />
      </div>

      <div className="space-y-2">
        {sections.map((s) => (
          <div key={s.section_name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {s.is_complete ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-gray-700 dark:text-gray-300">{s.section_name}</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              {Number(s.completeness_percentage || 0).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {!canSubmit && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Report should be at least 90% complete before distribution.</p>
          </div>
        </div>
      )}
    </div>
  )
}
