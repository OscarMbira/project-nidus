import { CheckCircle, AlertCircle } from 'lucide-react'

export default function RecommendationSection({ formData, onChange, errors, mode, options }) {
  const recommendedOption = options?.find(opt => opt.is_recommended)

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 7: Recommendation</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Provide formal recommendation based on options analysis
            </p>
          </div>
        </div>
      </div>

      {recommendedOption && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                Recommended Option: {recommendedOption.option_title || `Option ${recommendedOption.option_number}`}
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {recommendedOption.option_description}
              </p>
            </div>
          </div>
        </div>
      )}

      {!recommendedOption && options && options.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                No Recommended Option Selected
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Please mark one option as recommended in the Options Analysis section
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recommended Option Number
        </label>
        <input
          type="number"
          value={formData.recommended_option_number || ''}
          onChange={(e) => onChange('recommended_option_number', e.target.value ? parseInt(e.target.value) : null)}
          disabled={mode === 'view'}
          placeholder="Option number (1, 2, 3, etc.)"
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
        <p className="mt-1 text-xs text-gray-500">This should match the option number marked as recommended</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recommendation Summary *
        </label>
        <textarea
          value={formData.recommendation_summary || ''}
          onChange={(e) => onChange('recommendation_summary', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={5}
          placeholder="Provide a summary of the recommendation..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.recommendation_summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.recommendation_summary && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recommendation_summary}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum 100 characters required</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recommendation Justification *
        </label>
        <textarea
          value={formData.recommendation_justification || ''}
          onChange={(e) => onChange('recommendation_justification', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={6}
          placeholder="Explain why this option is recommended..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.recommendation_justification ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.recommendation_justification && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recommendation_justification}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum 100 characters required</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Requested Decision
        </label>
        <textarea
          value={formData.requested_decision || ''}
          onChange={(e) => onChange('requested_decision', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="What decision is requested from the Project Board..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>
    </div>
  )
}
