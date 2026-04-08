import { useState, useCallback, memo } from 'react'
import { Plus, X } from 'lucide-react'

/**
 * ScopeList Component
 * Manages individual scope items (in-scope and out-of-scope) with add/remove functionality
 * Stores items as array, converts to/from JSON for database storage
 */

function ScopeList({ scopeItems = [], scopeExclusions = [], onChange, errors = {} }) {
  const [newInScope, setNewInScope] = useState('')
  const [newOutOfScope, setNewOutOfScope] = useState('')

  // Parse items from string (JSON) or array
  const parseItems = useCallback((items) => {
    if (!items) return []
    if (Array.isArray(items)) return items
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return items.trim() ? [items] : []
    }
  }, [])

  const inScopeArray = parseItems(scopeItems)
  const outOfScopeArray = parseItems(scopeExclusions)

  const handleAddInScope = useCallback(() => {
    const trimmed = newInScope.trim()
    if (!trimmed) return

    const updated = [...inScopeArray, trimmed]
    onChange({ target: { name: 'scope', value: JSON.stringify(updated) } })
    setNewInScope('')
  }, [newInScope, inScopeArray, onChange])

  const handleAddOutOfScope = useCallback(() => {
    const trimmed = newOutOfScope.trim()
    if (!trimmed) return

    const updated = [...outOfScopeArray, trimmed]
    onChange({ target: { name: 'scope_exclusions', value: JSON.stringify(updated) } })
    setNewOutOfScope('')
  }, [newOutOfScope, outOfScopeArray, onChange])

  const handleRemoveInScope = useCallback((index) => {
    const updated = inScopeArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'scope', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [inScopeArray, onChange])

  const handleRemoveOutOfScope = useCallback((index) => {
    const updated = outOfScopeArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'scope_exclusions', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [outOfScopeArray, onChange])

  const handleUpdateInScope = useCallback((index, newValue) => {
    const updated = [...inScopeArray]
    updated[index] = newValue.trim()
    onChange({ target: { name: 'scope', value: JSON.stringify(updated) } })
  }, [inScopeArray, onChange])

  const handleUpdateOutOfScope = useCallback((index, newValue) => {
    const updated = [...outOfScopeArray]
    updated[index] = newValue.trim()
    onChange({ target: { name: 'scope_exclusions', value: JSON.stringify(updated) } })
  }, [outOfScopeArray, onChange])

  const handleKeyPress = useCallback((e, handler) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handler()
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* In-Scope Deliverables */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          In-Scope Deliverables
        </label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newInScope}
                onChange={(e) => setNewInScope(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddInScope)}
                placeholder="Enter an in-scope deliverable..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddInScope}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={!newInScope.trim()}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {inScopeArray.length > 0 ? (
            <div className="space-y-2">
              {inScopeArray.map((item, index) => (
                <ScopeItem
                  key={index}
                  item={item}
                  index={index}
                  onUpdate={handleUpdateInScope}
                  onRemove={handleRemoveInScope}
                  type="in-scope"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No in-scope deliverables added yet.
            </div>
          )}
        </div>
      </div>

      {/* Out-of-Scope Exclusions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Out-of-Scope (Exclusions)
        </label>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newOutOfScope}
                onChange={(e) => setNewOutOfScope(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddOutOfScope)}
                placeholder="Enter an out-of-scope exclusion..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAddOutOfScope}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={!newOutOfScope.trim()}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {outOfScopeArray.length > 0 ? (
            <div className="space-y-2">
              {outOfScopeArray.map((item, index) => (
                <ScopeItem
                  key={index}
                  item={item}
                  index={index}
                  onUpdate={handleUpdateOutOfScope}
                  onRemove={handleRemoveOutOfScope}
                  type="out-of-scope"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
              No exclusions added yet.
            </div>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {errors.scope && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.scope}</p>
      )}
      {errors.scope_exclusions && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.scope_exclusions}</p>
      )}
    </div>
  )
}

// Memoized Scope Item Component
const ScopeItem = memo(function ScopeItem({ item, index, onUpdate, onRemove, type }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item)
  const bgColor = type === 'in-scope' 
    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'

  const handleSave = useCallback(() => {
    if (editValue.trim()) {
      onUpdate(index, editValue)
      setIsEditing(false)
    }
  }, [editValue, index, onUpdate])

  const handleCancel = useCallback(() => {
    setEditValue(item)
    setIsEditing(false)
  }, [item])

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
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor} hover:opacity-90 transition-opacity`}>
      <div className="flex-1 flex items-start gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 min-w-[24px]">
          {index + 1}.
        </span>
        <span 
          className="flex-1 text-gray-900 dark:text-white cursor-text"
          onClick={() => setIsEditing(true)}
        >
          {item}
        </span>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="Edit item"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove item"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(ScopeList)
