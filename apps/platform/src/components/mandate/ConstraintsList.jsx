import { useState, useCallback, memo } from 'react'
import { Plus, X } from 'lucide-react'

/**
 * ConstraintsList Component
 * Manages individual constraint items with add/remove functionality
 * Stores items as array, converts to/from JSON for database storage
 */

function ConstraintsList({ constraints = [], onChange, errors = {}, placeholder = "Enter a constraint..." }) {
  const [newConstraint, setNewConstraint] = useState('')

  // Parse constraints from string (JSON) or array
  const parseConstraints = useCallback((items) => {
    if (!items) return []
    if (Array.isArray(items)) return items
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return items.trim() ? [items] : []
    }
  }, [])

  const constraintsArray = parseConstraints(constraints)

  const handleAddConstraint = useCallback(() => {
    const trimmed = newConstraint.trim()
    if (!trimmed) return

    const updated = [...constraintsArray, trimmed]
    onChange({ target: { name: 'constraints', value: JSON.stringify(updated) } })
    setNewConstraint('')
  }, [newConstraint, constraintsArray, onChange])

  const handleRemoveConstraint = useCallback((index) => {
    const updated = constraintsArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'constraints', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [constraintsArray, onChange])

  const handleUpdateConstraint = useCallback((index, newValue) => {
    const updated = [...constraintsArray]
    updated[index] = newValue.trim()
    onChange({ target: { name: 'constraints', value: JSON.stringify(updated) } })
  }, [constraintsArray, onChange])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddConstraint()
    }
  }, [handleAddConstraint])

  return (
    <div className="space-y-4">
      {/* Add New Constraint */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={newConstraint}
            onChange={(e) => setNewConstraint(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAddConstraint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={!newConstraint.trim()}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Constraints List */}
      {constraintsArray.length > 0 ? (
        <div className="space-y-2">
          {constraintsArray.map((constraint, index) => (
            <ConstraintItem
              key={index}
              constraint={constraint}
              index={index}
              onUpdate={handleUpdateConstraint}
              onRemove={handleRemoveConstraint}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No constraints added yet. Add your first constraint above.
        </div>
      )}

      {/* Error Message */}
      {errors.constraints && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.constraints}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Press Enter to add a constraint. Examples: "Budget limit: $500K", "Must complete by Q2 2026", "Requires approval from Board"
      </p>
    </div>
  )
}

// Memoized Constraint Item Component
const ConstraintItem = memo(function ConstraintItem({ constraint, index, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(constraint)

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onUpdate(index, editValue)
      setIsEditing(false)
    }
  }, [editValue, index, onUpdate])

  const handleCancel = useCallback(() => {
    setEditValue(constraint)
    setIsEditing(false)
  }, [constraint])

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
    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 hover:opacity-90 transition-opacity">
      <div className="flex-1 flex items-start gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 min-w-[24px]">
          {index + 1}.
        </span>
        <span 
          className="flex-1 text-gray-900 dark:text-white cursor-text"
          onClick={() => setIsEditing(true)}
        >
          {constraint}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Edit constraint"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove constraint"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(ConstraintsList)
