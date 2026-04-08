import { useState, useEffect } from 'react'
import { Plus, X, Edit2, CheckCircle, AlertTriangle } from 'lucide-react'
import { addOption, updateOption, deleteOption, setRecommendedOption } from '../../../services/exceptionReportOptionsService'
import OptionCard from './OptionCard'

export default function OptionsSection({ reportId, options, onOptionsChange, formData, onChange, errors, mode }) {
  const [editingOption, setEditingOption] = useState(null)
  const [showOptionForm, setShowOptionForm] = useState(false)

  const handleAddOption = async (optionData) => {
    if (!reportId) {
      // If report not saved yet, add to local state
      const newOption = {
        id: `temp-${Date.now()}`,
        option_number: options.length + 1,
        ...optionData,
        is_recommended: false
      }
      onOptionsChange([...options, newOption])
      setShowOptionForm(false)
      return
    }

    try {
      const newOption = await addOption(reportId, optionData)
      onOptionsChange([...options, newOption])
      setShowOptionForm(false)
    } catch (error) {
      console.error('Error adding option:', error)
      alert('Error adding option: ' + error.message)
    }
  }

  const handleUpdateOption = async (optionId, updates) => {
    if (!reportId) {
      // Update local state
      onOptionsChange(options.map(opt => opt.id === optionId ? { ...opt, ...updates } : opt))
      setEditingOption(null)
      return
    }

    try {
      const updated = await updateOption(optionId, updates)
      onOptionsChange(options.map(opt => opt.id === optionId ? updated : opt))
      setEditingOption(null)
    } catch (error) {
      console.error('Error updating option:', error)
      alert('Error updating option: ' + error.message)
    }
  }

  const handleDeleteOption = async (optionId) => {
    if (!confirm('Are you sure you want to delete this option?')) return

    if (!reportId) {
      onOptionsChange(options.filter(opt => opt.id !== optionId))
      return
    }

    try {
      await deleteOption(optionId)
      onOptionsChange(options.filter(opt => opt.id !== optionId))
    } catch (error) {
      console.error('Error deleting option:', error)
      alert('Error deleting option: ' + error.message)
    }
  }

  const handleSetRecommended = async (optionNumber) => {
    if (!reportId) {
      // Update local state
      onOptionsChange(options.map(opt => ({
        ...opt,
        is_recommended: opt.option_number === optionNumber
      })))
      onChange('recommended_option_number', optionNumber)
      return
    }

    try {
      await setRecommendedOption(reportId, optionNumber)
      onOptionsChange(options.map(opt => ({
        ...opt,
        is_recommended: opt.option_number === optionNumber
      })))
      onChange('recommended_option_number', optionNumber)
    } catch (error) {
      console.error('Error setting recommended option:', error)
      alert('Error setting recommended option: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 6: Options Analysis</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Analyze multiple options with impact assessment. At least 2 options required.
            </p>
          </div>
        </div>
      </div>

      {errors.options && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.options}</p>
        </div>
      )}

      {errors.recommendation && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.recommendation}</p>
        </div>
      )}

      <div className="space-y-4">
        {options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            onEdit={mode !== 'view' ? () => setEditingOption(option.id) : null}
            onDelete={mode !== 'view' ? () => handleDeleteOption(option.id) : null}
            onSetRecommended={mode !== 'view' ? () => handleSetRecommended(option.option_number) : null}
            isEditing={editingOption === option.id}
            onSave={(updates) => handleUpdateOption(option.id, updates)}
            onCancel={() => setEditingOption(null)}
            mode={mode}
          />
        ))}
      </div>

      {mode !== 'view' && (
        <div>
          {showOptionForm || editingOption === 'new' ? (
            <OptionCard
              option={null}
              isEditing={true}
              onSave={handleAddOption}
              onCancel={() => {
                setShowOptionForm(false)
                setEditingOption(null)
              }}
              mode={mode}
            />
          ) : (
            <button
              onClick={() => {
                setShowOptionForm(true)
                setEditingOption('new')
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Option</span>
            </button>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p>• At least 2 options are required</p>
        <p>• Exactly one option must be marked as recommended</p>
        <p>• Each option should include impact analysis on business case, tolerances, and risks</p>
      </div>
    </div>
  )
}
