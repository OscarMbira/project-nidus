/**
 * Lessons Report Overview Section
 * Purpose, context, scope, and executive summary
 */

function LessonsReportOverviewSectionBody({
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
        <FieldLabelWithHelp helpKey="public.lessons_reports.purpose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>
          Purpose <span className="text-red-500">*</span>
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="public.lessons_reports.context" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Context
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="public.lessons_reports.scope" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Scope
        </FieldLabelWithHelp>
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
        <FieldLabelWithHelp helpKey="public.lessons_reports.executive_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" required>
          Executive Summary <span className="text-red-500">*</span>
        </FieldLabelWithHelp>
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

// v1345 slice 4: field help for this component (public.lessons_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'purpose', 'context', 'scope', 'executive_summary',
].map((name) => `public.lessons_reports.${name}`)

export default function LessonsReportOverviewSection(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <LessonsReportOverviewSectionBody {...props} />
    </FieldHelpScope>
  )
}
