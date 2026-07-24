import { useState, useCallback, memo } from 'react'
import { Plus, X, Search } from 'lucide-react'

/**
 * ObjectivesList Component
 * Manages individual project objectives with add/remove functionality
 * Stores objectives as array, converts to/from JSON for database storage
 */

function ObjectivesList({ objectives = [], onChange, errors = {}, placeholder = "Enter a measurable objective..." }) {
  const [newObjective, setNewObjective] = useState('')

  // Parse objectives from string (JSON) or array
  const objectivesArray = useCallback(() => {
    if (!objectives) return []
    if (Array.isArray(objectives)) return objectives
    try {
      const parsed = JSON.parse(objectives)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      // If not JSON, treat as single text (backward compatibility)
      return objectives.trim() ? [objectives] : []
    }
  }, [objectives])

  const currentObjectives = objectivesArray()

  const handleAddObjective = useCallback(() => {
    const trimmed = newObjective.trim()
    if (!trimmed) return

    const updated = [...currentObjectives, trimmed]
    // Convert array to JSON string for storage
    onChange({ target: { name: 'project_objectives', value: JSON.stringify(updated) } })
    setNewObjective('')
  }, [newObjective, currentObjectives, onChange])

  const handleRemoveObjective = useCallback((index) => {
    const updated = currentObjectives.filter((_, i) => i !== index)
    // Convert array to JSON string for storage
    onChange({ target: { name: 'project_objectives', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [currentObjectives, onChange])

  const handleUpdateObjective = useCallback((index, newValue) => {
    const updated = [...currentObjectives]
    updated[index] = newValue.trim()
    onChange({ target: { name: 'project_objectives', value: JSON.stringify(updated) } })
  }, [currentObjectives, onChange])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddObjective()
    }
  }, [handleAddObjective])

  return (
    <div className="space-y-4">
      {/* Add New Objective */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleAddObjective}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={!newObjective.trim()}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Objectives List */}
      {currentObjectives.length > 0 ? (
        <div className="space-y-2">
          {currentObjectives.map((objective, index) => (
            <ObjectiveItem
              key={index}
              objective={objective}
              index={index}
              onUpdate={handleUpdateObjective}
              onRemove={handleRemoveObjective}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No objectives added yet. Add your first objective above.
        </div>
      )}

      {/* Error Message */}
      {errors.project_objectives && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Press Enter to add an objective. Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound).
      </p>
    </div>
  )
}

// Memoized Objective Item Component
const ObjectiveItem = memo(function ObjectiveItem({ objective, index, onUpdate, onRemove }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(objective)

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onUpdate(index, editValue)
      setIsEditing(false)
    }
  }, [editValue, index, onUpdate])

  const handleCancel = useCallback(() => {
    setEditValue(objective)
    setIsEditing(false)
  }, [objective])

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
    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors">
      <div className="flex-1 flex items-start gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 min-w-[24px]">
          {index + 1}.
        </span>
        <span 
          className="flex-1 text-gray-900 dark:text-white cursor-text"
          onClick={() => setIsEditing(true)}
        >
          {objective}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Edit objective"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove objective"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(ObjectivesList)
