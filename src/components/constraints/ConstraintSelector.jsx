/**
 * Constraint Selector Component
 * Main composite component for managing structured constraints in mandate forms
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { getConstraintCategories } from '../../services/constraintCategoryService'
import { getSimConstraintCategories } from '../../services/simConstraintCategoryService'
import { checkCategoryExists } from '../../services/mandateConstraintService'
import { checkSimCategoryExists } from '../../services/simMandateConstraintService'
import ConstraintCategorySelect from './ConstraintCategorySelect'
import ConstraintOperandSelect from './ConstraintOperandSelect'
import ConstraintValueInput from './ConstraintValueInput'
import ConstraintListItem from './ConstraintListItem'

function ConstraintSelector({ 
  mandateId = null, // null for create mode, UUID for edit mode
  constraints = [], // Array of constraint objects with category data
  onChange, // Callback: (constraints) => void
  readOnly = false,
  errors = {},
  isSimulator = false, // Set to true for simulator mode
  initialCategories = [] // Prefetched categories to avoid mount delay
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [loading, setLoading] = useState(initialCategories.length === 0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newConstraint, setNewConstraint] = useState({
    categoryId: null,
    category: null,
    operand: null,
    valueNumeric: null,
    valueMin: null,
    valueMax: null,
    valueText: null,
    valueDate: null,
    unit: null,
    notes: null
  })
  const [validationErrors, setValidationErrors] = useState({})

  // Load categories on mount (skip if pre-populated)
  useEffect(() => {
    if (initialCategories.length > 0) {
      setCategories(initialCategories)
      setLoading(false)
      return
    }
    loadCategories()
  }, [isSimulator, initialCategories.length])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const getCategoriesFn = isSimulator ? getSimConstraintCategories : getConstraintCategories
      const result = await getCategoriesFn()
      if (result.success) {
        setCategories(result.data || [])
      } else {
        setCategories([])
      }
    } catch (error) {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  // Get categories already used (to exclude from dropdown)
  const usedCategoryIds = useMemo(() => {
    return constraints.map(c => c.constraint_category_id || c.constraint_category?.id).filter(Boolean)
  }, [constraints])

  // Handle category selection
  const handleCategorySelect = useCallback((category) => {
    if (!category) {
      setNewConstraint(prev => ({
        ...prev,
        categoryId: null,
        category: null,
        operand: null,
        unit: null
      }))
      setValidationErrors({})
      return
    }

    // Check if category already exists (works for both create and edit modes)
    if (usedCategoryIds.includes(category.id)) {
      setValidationErrors({ category: 'This constraint category has already been added. Each category can only be selected once.' })
      return
    }

    setNewConstraint(prev => ({
      ...prev,
      categoryId: category.id,
      category: category,
      operand: category.supports_operands ? (category.operand_options?.[0] || null) : null,
      unit: category.unit_options?.[0] || null,
      valueNumeric: null,
      valueMin: null,
      valueMax: null,
      valueText: null,
      valueDate: null
    }))
    setValidationErrors({})
  }, [usedCategoryIds])

  // Handle operand change
  const handleOperandChange = useCallback((operand) => {
    setNewConstraint(prev => ({
      ...prev,
      operand,
      // Clear values when switching operands
      valueNumeric: null,
      valueMin: null,
      valueMax: null
    }))
  }, [])

  // Handle value changes - map snake_case from ConstraintValueInput to camelCase state
  const handleValueChange = useCallback((updates) => {
    // Map snake_case keys to camelCase to match state structure
    const mappedUpdates = {}
    for (const [key, value] of Object.entries(updates)) {
      switch (key) {
        case 'value_numeric':
          mappedUpdates.valueNumeric = value
          break
        case 'value_min':
          mappedUpdates.valueMin = value
          break
        case 'value_max':
          mappedUpdates.valueMax = value
          break
        case 'value_text':
          mappedUpdates.valueText = value
          break
        case 'value_date':
          mappedUpdates.valueDate = value
          break
        default:
          mappedUpdates[key] = value
      }
    }
    setNewConstraint(prev => ({ ...prev, ...mappedUpdates }))
    setValidationErrors({})
  }, [])

  // Validate new constraint
  const validateConstraint = useCallback(() => {
    const errors = {}

    if (!newConstraint.categoryId) {
      errors.category = 'Constraint category is required'
    }

    if (!newConstraint.category) {
      return errors
    }

    const { value_type, supports_operands } = newConstraint.category

    // Validate based on value type
    if (value_type === 'numeric') {
      if (supports_operands && !newConstraint.operand) {
        errors.operand = 'Operand is required for numeric constraints'
      }
      if (newConstraint.operand === 'between') {
        if (!newConstraint.valueMin && newConstraint.valueMin !== 0) {
          errors.valueMin = 'Minimum value is required'
        }
        if (!newConstraint.valueMax && newConstraint.valueMax !== 0) {
          errors.valueMax = 'Maximum value is required'
        }
        if (newConstraint.valueMin !== null && newConstraint.valueMax !== null && 
            newConstraint.valueMin >= newConstraint.valueMax) {
          errors.valueMax = 'Maximum must be greater than minimum'
        }
      } else {
        if (newConstraint.valueNumeric === null || newConstraint.valueNumeric === undefined) {
          errors.valueNumeric = 'Value is required'
        }
      }
    } else if (value_type === 'text') {
      if (!newConstraint.valueText?.trim()) {
        errors.valueText = 'Text value is required'
      }
    } else if (value_type === 'dropdown') {
      if (!newConstraint.valueText) {
        errors.valueText = 'Please select a value'
      }
    } else if (value_type === 'date') {
      if (!newConstraint.valueDate) {
        errors.valueDate = 'Date is required'
      }
    }

    return errors
  }, [newConstraint, usedCategoryIds])

  // Add new constraint
  const handleAddConstraint = useCallback(() => {
    // Final check: prevent duplicate categories
    if (newConstraint.categoryId && usedCategoryIds.includes(newConstraint.categoryId)) {
      setValidationErrors({ category: 'This constraint category has already been added. Each category can only be selected once.' })
      return
    }

    const errors = validateConstraint()
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const constraintData = {
      id: `temp-${Date.now()}`, // Temporary ID for create mode
      constraint_category_id: newConstraint.categoryId,
      constraint_category: newConstraint.category,
      operand: newConstraint.operand,
      value_numeric: newConstraint.valueNumeric,
      value_min: newConstraint.valueMin,
      value_max: newConstraint.valueMax,
      value_text: newConstraint.valueText,
      value_date: newConstraint.valueDate,
      unit: newConstraint.unit,
      notes: newConstraint.notes
    }

    const updated = [...constraints, constraintData]
    onChange(updated)

    // Reset form
    setNewConstraint({
      categoryId: null,
      category: null,
      operand: null,
      valueNumeric: null,
      valueMin: null,
      valueMax: null,
      valueText: null,
      valueDate: null,
      unit: null,
      notes: null
    })
    setShowAddForm(false)
    setValidationErrors({})
  }, [newConstraint, constraints, onChange, validateConstraint, usedCategoryIds])

  // Edit constraint
  const handleEditConstraint = useCallback((constraint) => {
    setNewConstraint({
      categoryId: constraint.constraint_category_id || constraint.constraint_category?.id,
      category: constraint.constraint_category,
      operand: constraint.operand,
      valueNumeric: constraint.value_numeric,
      valueMin: constraint.value_min,
      valueMax: constraint.value_max,
      valueText: constraint.value_text,
      valueDate: constraint.value_date,
      unit: constraint.unit,
      notes: constraint.notes
    })
    setShowAddForm(true)
    
    // Remove the constraint being edited
    const updated = constraints.filter(c => 
      (c.id || c.constraint_category_id) !== (constraint.id || constraint.constraint_category_id)
    )
    onChange(updated)
  }, [constraints, onChange])

  // Delete constraint
  const handleDeleteConstraint = useCallback((constraint) => {
    const updated = constraints.filter(c => 
      (c.id || c.constraint_category_id) !== (constraint.id || constraint.constraint_category_id)
    )
    onChange(updated)
  }, [constraints, onChange])

  // Cancel add/edit
  const handleCancel = useCallback(() => {
    setShowAddForm(false)
    setNewConstraint({
      categoryId: null,
      category: null,
      operand: null,
      valueNumeric: null,
      valueMin: null,
      valueMax: null,
      valueText: null,
      valueDate: null,
      unit: null,
      notes: null
    })
    setValidationErrors({})
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading constraint categories...</p>
      </div>
    )
  }
  
  // Show warning if no categories loaded
  if (!loading && categories.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              No Constraint Categories Found
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Please ensure the SQL migration <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">v251_constraint_categories_table.sql</code> has been run on your database.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              This migration creates the constraint_categories table and seeds 17 predefined categories.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const showOperand = newConstraint.category?.supports_operands && newConstraint.category?.value_type === 'numeric'
  const showValueInput = !!newConstraint.category

  return (
    <div className="space-y-4">
      {/* Add Constraint Button */}
      {!showAddForm && !readOnly && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Constraint
        </button>
      )}

      {/* Add/Edit Form */}
      {showAddForm && !readOnly && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-600">
          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Constraint Category <span className="text-red-500">*</span>
            </label>
            <ConstraintCategorySelect
              categories={categories}
              selectedCategoryId={newConstraint.categoryId}
              onChange={handleCategorySelect}
              excludeIds={usedCategoryIds}
              disabled={readOnly}
              placeholder="Select constraint category..."
            />
            {validationErrors.category && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {validationErrors.category}
              </p>
            )}
          </div>

          {/* Operand Select (for numeric constraints) */}
          {showOperand && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comparison <span className="text-red-500">*</span>
              </label>
              <ConstraintOperandSelect
                value={newConstraint.operand}
                onChange={handleOperandChange}
                availableOperands={newConstraint.category?.operand_options}
                disabled={readOnly}
              />
              {validationErrors.operand && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.operand}
                </p>
              )}
            </div>
          )}

          {/* Value Input */}
          {showValueInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Value <span className="text-red-500">*</span>
              </label>
              <ConstraintValueInput
                category={newConstraint.category}
                operand={newConstraint.operand}
                value={
                  newConstraint.category?.value_type === 'numeric'
                    ? newConstraint.valueNumeric
                    : newConstraint.category?.value_type === 'date'
                      ? newConstraint.valueDate
                      : newConstraint.valueText
                }
                valueMin={newConstraint.valueMin}
                valueMax={newConstraint.valueMax}
                valueText={newConstraint.valueText}
                valueDate={newConstraint.valueDate}
                unit={newConstraint.unit}
                onChange={handleValueChange}
                disabled={readOnly}
              />
              {(validationErrors.valueNumeric || validationErrors.valueMin || validationErrors.valueMax || validationErrors.valueText || validationErrors.valueDate) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.valueNumeric || validationErrors.valueMin || validationErrors.valueMax || validationErrors.valueText || validationErrors.valueDate}
                </p>
              )}
            </div>
          )}

          {/* Notes (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={newConstraint.notes || ''}
              onChange={(e) => handleValueChange({ notes: e.target.value })}
              placeholder="Additional context or details..."
              rows={3}
              disabled={readOnly}
              className="w-full min-h-[4.5rem] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddConstraint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Constraint
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Constraints List */}
      {constraints.length > 0 ? (
        <div className="space-y-2">
          {constraints.map((constraint, index) => (
            <ConstraintListItem
              key={constraint.id || `constraint-${index}`}
              constraint={constraint}
              onEdit={readOnly ? null : handleEditConstraint}
              onDelete={readOnly ? null : handleDeleteConstraint}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No constraints added yet. {!readOnly && 'Click "Add Constraint" to get started.'}
        </div>
      )}

      {/* Error Message */}
      {errors.constraints && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.constraints}</p>
      )}
    </div>
  )
}

export default memo(ConstraintSelector)
