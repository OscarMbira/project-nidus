/**
 * Lessons Review Section
 * Lessons learned reviewed and applied
 */

export default function LessonsReviewSection({ formData, onChange, errors = {}, readOnly = false }) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    onChange({
      target: {
        name,
        value: type === 'checkbox' ? checked : value
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Lessons Learned Review
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Document lessons learned that have been reviewed and applied to this project
        </p>
      </div>

      {/* Lessons Reviewed Checkbox */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            name="lessons_learned_reviewed"
            checked={formData.lessons_learned_reviewed || false}
            onChange={handleChange}
            disabled={readOnly}
            className="mr-3 w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Lessons learned have been reviewed
          </span>
        </label>
        {readOnly && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {formData.lessons_learned_reviewed ? 'Yes' : 'No'}
          </p>
        )}
      </div>

      {/* Lessons Review Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lessons Review Summary
        </label>
        {readOnly ? (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {formData.lessons_review_summary || 'Not specified'}
          </p>
        ) : (
          <textarea
            name="lessons_review_summary"
            value={formData.lessons_review_summary || ''}
            onChange={handleChange}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Summarize the lessons learned that were reviewed and how they apply to this project..."
          />
        )}
      </div>
    </div>
  )
}
