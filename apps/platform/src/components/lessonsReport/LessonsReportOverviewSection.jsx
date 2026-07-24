/**
 * Lessons Report Overview Section
 * Purpose, context, scope, and executive summary
 */

export default function LessonsReportOverviewSection({
  formData,
  onChange,
  errors = {},
  readOnly = false
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Overview & Context
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define the purpose, context, and scope of this Lessons Report
        </p>
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Purpose <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.purpose || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              value={formData.purpose || ''}
              onChange={(e) => onChange('purpose', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Explain the purpose of this Lessons Report..."
              required
            />
            {errors.purpose && (
              <p className="mt-1 text-sm text-red-600">{errors.purpose}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Minimum 50 characters required</p>
          </>
        )}
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Context
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.context || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.context || ''}
            onChange={(e) => onChange('context', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Provide context about the stage/project/domain..."
          />
        )}
      </div>

      {/* Scope */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Scope
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.scope || 'Not specified'}
          </p>
        ) : (
          <textarea
            value={formData.scope || ''}
            onChange={(e) => onChange('scope', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Define the scope of lessons covered in this report..."
          />
        )}
      </div>

      {/* Executive Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Executive Summary <span className="text-red-500">*</span>
        </label>
        {readOnly ? (
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {formData.executive_summary || 'Not specified'}
          </p>
        ) : (
          <>
            <textarea
              value={formData.executive_summary || ''}
              onChange={(e) => onChange('executive_summary', e.target.value)}
              rows={6}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.executive_summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Provide a high-level summary of findings and key recommendations..."
              required
            />
            {errors.executive_summary && (
              <p className="mt-1 text-sm text-red-600">{errors.executive_summary}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Minimum 100 characters required</p>
          </>
        )}
      </div>
    </div>
  )
}
