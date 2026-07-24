/**
 * PID Objectives Section Component
 * Displays and manages project objectives within the PID
 */

import { useState } from 'react'
import { Plus, Target, Edit2, Trash2 } from 'lucide-react'
import ObjectiveForm from './ObjectiveForm'
import ObjectiveCard from './ObjectiveCard'

export default function ObjectivesSection({
  pidId,
  objectives = [],
  onObjectivesChange,
  readOnly = false
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingObjective, setEditingObjective] = useState(null)

  const handleAddClick = () => {
    setEditingObjective(null)
    setShowForm(true)
  }

  const handleEditClick = (objective) => {
    setEditingObjective(objective)
    setShowForm(true)
  }

  const handleSave = (objective) => {
    if (editingObjective) {
      const updated = objectives.map(o =>
        o.id === editingObjective.id ? { ...o, ...objective } : o
      )
      if (onObjectivesChange) onObjectivesChange(updated)
    } else {
      if (onObjectivesChange) onObjectivesChange([...objectives, objective])
    }
    setShowForm(false)
    setEditingObjective(null)
  }

  const handleDelete = (objectiveId) => {
    if (window.confirm('Are you sure you want to delete this objective?')) {
      const filtered = objectives.filter(o => o.id !== objectiveId)
      if (onObjectivesChange) onObjectivesChange(filtered)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="h-5 w-5" />
          Project Objectives
        </h3>
        {!readOnly && (
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Objective
          </button>
        )}
      </div>

      {objectives.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Target className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No objectives defined yet</p>
          {!readOnly && (
            <button
              onClick={handleAddClick}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Add First Objective
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {objectives.map((objective) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              onEdit={() => handleEditClick(objective)}
              onDelete={() => handleDelete(objective.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ObjectiveForm
          pidId={pidId}
          objective={editingObjective}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingObjective(null)
          }}
        />
      )}
    </div>
  )
}
