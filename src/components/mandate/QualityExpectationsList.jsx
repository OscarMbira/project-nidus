import { useState, useCallback, memo } from 'react'
import { Plus, X } from 'lucide-react'

/**
 * QualityExpectationsList Component
 * Manages individual quality expectation items with add/remove functionality
 * Stores items as array, converts to/from JSON for database storage
 */

function QualityExpectationsList({ expectations = [], onChange, errors = {}, placeholder = "Enter a quality expectation (e.g., 'ISO 9001 compliance', '99.9% uptime', 'Zero security breaches')..." }) {
  const [newExpectation, setNewExpectation] = useState('')

  // Parse expectations from string (JSON) or array
  const parseExpectations = useCallback((items) => {
    if (!items) return []
    if (Array.isArray(items)) return items
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return items.trim() ? [items] : []
    }
  }, [])

  const expectationsArray = parseExpectations(expectations)

  const handleAddExpectation = useCallback(() => {
    const trimmed = newExpectation.trim()
    if (!trimmed) return

    const updated = [...expectationsArray, trimmed]
    onChange({ target: { name: 'quality_expectations', value: JSON.stringify(updated) } })
    setNewExpectation('')
  }, [newExpectation, expectationsArray, onChange])

  const handleRemoveExpectation = useCallback((index) => {
    const updated = expectationsArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'quality_expectations', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [expectationsArray, onChange])

  const handleUpdateExpectation = useCallback((index, newValue) => {
    const updated = [...expectationsArray]
    updated[index] = newValue.trim()
    onChange({ target: { name: 'quality_expectations', value: JSON.stringify(updated) } })
  }, [expectationsArray, onChange])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddExpectation()
    }
  }, [handleAddExpectation])

  return (
    <div className="space-y-4">
      {/* Add New Expectation */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={newExpectation}
            onChange={(e) => setNewExpectation(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAddExpectation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={!newExpectation.trim()}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Expectations List */}
      {expectationsArray.length > 0 ? (
        <div className="space-y-2">
          {expectationsArray.map((expectation, index) => (
            <QualityExpectationItem
              key={index}
              expectation={expectation}
              index={index}
              onUpdate={handleUpdateExpectation}
              onRemove={handleRemoveExpectation}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No quality expectations added yet. Add your first expectation above.
        </div>
      )}

      {/* Error Message */}
      {errors.quality_expectations && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.quality_expectations}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Press Enter to add a quality expectation. Define time vs cost vs quality priorities and expectations.
      </p>
    </div>
  )
}

// Memoized Quality Expectation Item Component
const QualityExpectationItem = memo(function QualityExpectationItem({ expectation, index, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(expectation)

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onUpdate(index, editValue)
      setIsEditing(false)
    }
  }, [editValue, index, onUpdate])

  const handleCancel = useCallback(() => {
    setEditValue(expectation)
    setIsEditing(false)
  }, [expectation])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel])

  if (isEditing) {
    return (
      <div className="flex gap-2 items-start">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          autoFocus
          className="flex-1 px-3 py-2 border border-blue-500 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800 hover:opacity-90 transition-opacity">
      <div className="flex-1 flex items-start gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 min-w-[24px]">
          {index + 1}.
        </span>
        <span 
          className="flex-1 text-gray-900 dark:text-white cursor-text"
          onClick={() => setIsEditing(true)}
        >
          {expectation}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Edit expectation"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove expectation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(QualityExpectationsList)
