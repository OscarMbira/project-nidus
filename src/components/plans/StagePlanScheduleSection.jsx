/**
 * Stage Plan Schedule Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addMilestone, deleteMilestone } from '../../services/planMilestoneService'
import MilestoneForm from './MilestoneForm'
import MilestoneCard from './MilestoneCard'

export default function StagePlanScheduleSection({ 
  formData, 
  onChange, 
  errors, 
  milestones, 
  setMilestones, 
  planId, 
  mode 
}) {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState(null)

  const handleAddMilestone = async (milestoneData) => {
    if (!planId) {
      alert('Please save the plan first before adding milestones')
      return
    }

    try {
      const result = await addMilestone(planId, 'stage_plan', milestoneData)
      if (result.success) {
        setMilestones([...milestones, result.data])
        setShowMilestoneForm(false)
      } else {
        alert('Error adding milestone: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding milestone:', error)
      alert('Error adding milestone: ' + error.message)
    }
  }

  const handleDeleteMilestone = async (milestoneId) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return

    try {
      const result = await deleteMilestone(milestoneId, 'stage_plan')
      if (result.success) {
        setMilestones(milestones.filter(m => m.id !== milestoneId))
      } else {
        alert('Error deleting milestone: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting milestone:', error)
      alert('Error deleting milestone: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Schedule</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planned Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.planned_start_date || ''}
            onChange={(e) => onChange('planned_start_date', e.target.value)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.planned_start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.planned_start_date && (
            <p className="mt-1 text-sm text-red-500">{errors.planned_start_date}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planned End Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.planned_end_date || ''}
            onChange={(e) => onChange('planned_end_date', e.target.value)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.planned_end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.planned_end_date && (
            <p className="mt-1 text-sm text-red-500">{errors.planned_end_date}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Milestones</h3>
          {mode !== 'view' && planId && (
            <button
              onClick={() => {
                setEditingMilestone(null)
                setShowMilestoneForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </button>
          )}
        </div>

        {showMilestoneForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <MilestoneForm
              milestone={editingMilestone}
              onSubmit={handleAddMilestone}
              onCancel={() => {
                setShowMilestoneForm(false)
                setEditingMilestone(null)
              }}
              planType="stage_plan"
            />
          </div>
        )}

        {milestones.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No milestones added yet. {mode !== 'view' && planId && 'Click "Add Milestone" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {milestones.map(milestone => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onDelete={mode !== 'view' ? () => handleDeleteMilestone(milestone.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingMilestone(milestone)
                  setShowMilestoneForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dependencies (JSON Array)
        </label>
        <textarea
          value={formData.dependencies ? JSON.stringify(formData.dependencies, null, 2) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange('dependencies', parsed)
            } catch {
              // Invalid JSON, ignore
            }
          }}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          placeholder='[{"dependency": "...", "type": "..."}, ...]'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter dependencies as JSON array
        </p>
      </div>
    </div>
  )
}
