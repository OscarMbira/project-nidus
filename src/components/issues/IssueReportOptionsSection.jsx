import { useState } from 'react'
import { Plus, Trash2, Star, Edit2 } from 'lucide-react'

export default function IssueReportOptionsSection({
  formData,
  onChange,
  options = [],
  onOptionsChange,
  errors = {},
  readOnly = false
}) {
  const [editingOption, setEditingOption] = useState(null)

  const addOption = () => {
    const newOption = {
      option_number: options.length + 1,
      option_title: '',
      option_description: '',
      pros: '',
      cons: '',
      feasibility: '',
      cost_implications: '',
      time_implications: '',
      risk_implications: '',
      is_recommended: false,
      display_order: options.length
    }
    onOptionsChange([...options, newOption])
    setEditingOption(options.length)
  }

  const updateOption = (index, field, value) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    
    // If setting as recommended, unset others
    if (field === 'is_recommended' && value) {
      updated.forEach((opt, i) => {
        if (i !== index) opt.is_recommended = false
      })
      onChange('recommendation', updated[index].option_title)
    }
    
    onOptionsChange(updated)
  }

  const deleteOption = (index) => {
    if (confirm('Are you sure you want to delete this option?')) {
      const updated = options.filter((_, i) => i !== index)
      // Renumber options
      updated.forEach((opt, i) => {
        opt.option_number = i + 1
        opt.display_order = i
      })
      onOptionsChange(updated)
    }
  }

  const setRecommended = (index) => {
    const updated = [...options]
    updated.forEach((opt, i) => {
      opt.is_recommended = i === index
    })
    if (updated[index]) {
      onChange('recommendation', updated[index].option_title)
    }
    onOptionsChange(updated)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options & Recommendations</h3>
        </div>
        {!readOnly && (
          <button
            onClick={addOption}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Option
          </button>
        )}
      </div>

      {/* Options Analysis Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Options Analysis Summary
        </label>
        <textarea
          value={formData.options_analysis || ''}
          onChange={(e) => onChange('options_analysis', e.target.value)}
          readOnly={readOnly}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg ${
            readOnly
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
          }`}
          placeholder="Overall summary of the options analysis..."
        />
      </div>

      {/* Options List */}
      <div className="space-y-4">
        {options.map((option, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              option.is_recommended
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm font-medium">
                  Option {option.option_number}
                </span>
                {option.is_recommended && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm font-medium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Recommended
                  </span>
                )}
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  {!option.is_recommended && (
                    <button
                      onClick={() => setRecommended(index)}
                      className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      title="Set as Recommended"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteOption(index)}
                    className="px-2 py-1 text-sm border border-red-300 dark:border-red-600 rounded text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete Option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Option Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={option.option_title || ''}
                  onChange={(e) => updateOption(index, 'option_title', e.target.value)}
                  readOnly={readOnly}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                  placeholder="Brief title for this option"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={option.option_description || ''}
                  onChange={(e) => updateOption(index, 'option_description', e.target.value)}
                  readOnly={readOnly}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                  placeholder="Detailed description of this option"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Advantages (Pros)
                  </label>
                  <textarea
                    value={option.pros || ''}
                    onChange={(e) => updateOption(index, 'pros', e.target.value)}
                    readOnly={readOnly}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                    placeholder="List advantages..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Disadvantages (Cons)
                  </label>
                  <textarea
                    value={option.cons || ''}
                    onChange={(e) => updateOption(index, 'cons', e.target.value)}
                    readOnly={readOnly}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                    placeholder="List disadvantages..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feasibility Assessment
                </label>
                <textarea
                  value={option.feasibility || ''}
                  onChange={(e) => updateOption(index, 'feasibility', e.target.value)}
                  readOnly={readOnly}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    readOnly
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                  }`}
                  placeholder="Assess feasibility..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Implications
                  </label>
                  <textarea
                    value={option.cost_implications || ''}
                    onChange={(e) => updateOption(index, 'cost_implications', e.target.value)}
                    readOnly={readOnly}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Cost impact..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Implications
                  </label>
                  <textarea
                    value={option.time_implications || ''}
                    onChange={(e) => updateOption(index, 'time_implications', e.target.value)}
                    readOnly={readOnly}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Schedule impact..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Risk Implications
                  </label>
                  <textarea
                    value={option.risk_implications || ''}
                    onChange={(e) => updateOption(index, 'risk_implications', e.target.value)}
                    readOnly={readOnly}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      readOnly
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                    placeholder="Risk impact..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {options.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No options added yet. Click "Add Option" to create the first option.
          </div>
        )}
      </div>

      {/* Recommendation */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recommendation <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.recommendation || ''}
            onChange={(e) => onChange('recommendation', e.target.value)}
            readOnly={readOnly}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            } ${errors.recommendation ? 'border-red-500' : ''}`}
            placeholder="Recommended option and solution..."
          />
          {errors.recommendation && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recommendation}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recommendation Rationale
          </label>
          <textarea
            value={formData.recommendation_rationale || ''}
            onChange={(e) => onChange('recommendation_rationale', e.target.value)}
            readOnly={readOnly}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg ${
              readOnly
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white'
            }`}
            placeholder="Why this option is recommended..."
          />
        </div>
      </div>
    </div>
  )
}
