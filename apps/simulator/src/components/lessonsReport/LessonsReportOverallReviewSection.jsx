/**
 * Lessons Report Overall Review Section
 * What went well, what didn't go well, surprises, planned vs actual
 */

export default function LessonsReportOverallReviewSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Overall Review
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Overall assessment of what went well, what didn't, and unexpected events
        </p>
      </div>

      {/* What Went Well */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What Went Well
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.what_went_well_summary || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.what_went_well_summary || ''}
            onChange={(e) => onChange('what_went_well_summary', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Summarize what went well during this stage/project..."
          />
        )}
      </div>

      {/* What Did Not Go Well */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          What Did Not Go Well
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.what_did_not_go_well_summary || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.what_did_not_go_well_summary || ''}
            onChange={(e) => onChange('what_did_not_go_well_summary', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Summarize problems, issues, and challenges encountered..."
          />
        )}
        {errors.overall_review && (
          <p className="mt-1 text-sm text-red-600">{errors.overall_review}</p>
        )}
      </div>

      {/* Surprises/Unexpected */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Surprises / Unexpected Events
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.surprises_unexpected_summary || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.surprises_unexpected_summary || ''}
            onChange={(e) => onChange('surprises_unexpected_summary', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Document unexpected events, risks that materialized, or surprising outcomes..."
          />
        )}
      </div>

      {/* Planned vs Actual */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Planned vs Actual Analysis
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.planned_vs_actual_analysis || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.planned_vs_actual_analysis || ''}
            onChange={(e) => onChange('planned_vs_actual_analysis', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Compare planned outcomes with actual results and explain variances..."
          />
        )}
      </div>
    </div>
  )
}
