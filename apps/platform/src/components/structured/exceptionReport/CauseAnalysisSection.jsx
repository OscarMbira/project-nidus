import { useState } from 'react'
import { Target, X, Plus } from 'lucide-react'

export default function CauseAnalysisSection({ formData, onChange, errors, mode }) {
  const [newFactor, setNewFactor] = useState('')

  const handleAddFactor = () => {
    if (newFactor.trim()) {
      const factors = formData.contributing_factors || []
      onChange('contributing_factors', [...factors, newFactor.trim()])
      setNewFactor('')
    }
  }

  const handleRemoveFactor = (index) => {
    const factors = formData.contributing_factors || []
    onChange('contributing_factors', factors.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 4: Cause Analysis</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Analyze the root cause and contributing factors of the deviation
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cause Description *
        </label>
        <textarea
          value={formData.cause_description || ''}
          onChange={(e) => onChange('cause_description', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={5}
          placeholder="Describe the cause of the deviation..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.cause_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.cause_description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cause_description}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum 100 characters required</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Root Cause Category
        </label>
        <select
          value={formData.root_cause_category || ''}
          onChange={(e) => onChange('root_cause_category', e.target.value || null)}
          disabled={mode === 'view'}
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        >
          <option value="">Select Category</option>
          <option value="planning">Planning</option>
          <option value="execution">Execution</option>
          <option value="external">External</option>
          <option value="resource">Resource</option>
          <option value="technical">Technical</option>
          <option value="stakeholder">Stakeholder</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Root Cause Analysis *
        </label>
        <textarea
          value={formData.root_cause_analysis || ''}
          onChange={(e) => onChange('root_cause_analysis', e.target.value)}
          required
          disabled={mode === 'view'}
          rows={6}
          placeholder="Provide detailed root cause analysis..."
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
            errors.root_cause_analysis ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {errors.root_cause_analysis && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.root_cause_analysis}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">Minimum 100 characters required</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Contributing Factors
        </label>
        <div className="space-y-2">
          {(formData.contributing_factors || []).map((factor, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
              <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{factor}</span>
              {mode !== 'view' && (
                <button
                  onClick={() => handleRemoveFactor(index)}
                  className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {mode !== 'view' && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFactor()}
                placeholder="Add contributing factor..."
                className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              />
              <button
                onClick={handleAddFactor}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
