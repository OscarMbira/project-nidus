import { AlertTriangle } from 'lucide-react'

export default function EPRProjectManagerReport({ formData, onChange, errors, mode }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Project Manager's Report</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Section 3: The Project Manager's comprehensive report on project completion, performance, and outcomes.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Manager's Report *
        </label>
        <textarea
          value={formData.project_managers_report || ''}
          onChange={(e) => onChange('project_managers_report', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={12}
          placeholder="Provide a comprehensive report covering: project objectives achievement, performance against plan, key achievements, challenges encountered, stakeholder management, team performance, and overall project success..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.project_managers_report
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {(formData.project_managers_report || '').length} / 100 characters minimum
        </p>
        {errors.project_managers_report && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_managers_report}</p>
        )}
      </div>

      {(formData.closure_type === 'early-termination' || formData.closure_type === 'premature' || formData.closure_type === 'cancelled') && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Abnormal Closure</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Abnormal Situations Description *
              </label>
              <textarea
                value={formData.abnormal_situations || ''}
                onChange={(e) => onChange('abnormal_situations', e.target.value)}
                required={formData.closure_type !== 'normal'}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Describe the abnormal situations that led to this closure type..."
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.abnormal_situations
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.abnormal_situations && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.abnormal_situations}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Impact of Abnormal Situations *
              </label>
              <textarea
                value={formData.abnormal_situations_impact || ''}
                onChange={(e) => onChange('abnormal_situations_impact', e.target.value)}
                required={formData.closure_type !== 'normal'}
                disabled={mode === 'view'}
                rows={4}
                placeholder="Describe the impact of these abnormal situations on the project..."
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.abnormal_situations_impact
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.abnormal_situations_impact && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.abnormal_situations_impact}</p>
              )}
            </div>
            {formData.closure_type === 'premature' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Premature Closure Reason
                </label>
                <textarea
                  value={formData.premature_closure_reason || ''}
                  onChange={(e) => onChange('premature_closure_reason', e.target.value)}
                  disabled={mode === 'view'}
                  rows={3}
                  placeholder="Explain why the project was closed prematurely..."
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                    'border-gray-300 dark:border-gray-600'
                  } ${mode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Report Should Include:</h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Project objectives achievement summary</li>
          <li>Performance against baseline plan (schedule, cost, scope, quality)</li>
          <li>Key achievements and deliverables</li>
          <li>Challenges encountered and how they were managed</li>
          <li>Stakeholder management effectiveness</li>
          <li>Team performance and recognition</li>
          <li>Overall project success assessment</li>
        </ul>
      </div>
    </div>
  )
}
