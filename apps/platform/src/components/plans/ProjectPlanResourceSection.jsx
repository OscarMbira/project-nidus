/**
 * Project Plan Resource Section
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addResource, deleteResource } from '../../services/planResourceService'
import ResourceForm from './ResourceForm'
import ResourceCard from './ResourceCard'

export default function ProjectPlanResourceSection({ 
  formData, 
  onChange, 
  resources, 
  setResources, 
  planId, 
  mode 
}) {
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [editingResource, setEditingResource] = useState(null)

  const handleAddResource = async (resourceData) => {
    if (!planId) {
      alert('Please save the plan first before adding resources')
      return
    }

    try {
      const result = await addResource(planId, 'project_plan', resourceData)
      if (result.success) {
        setResources([...resources, result.data])
        setShowResourceForm(false)
      } else {
        alert('Error adding resource: ' + result.error)
      }
    } catch (error) {
      console.error('Error adding resource:', error)
      alert('Error adding resource: ' + error.message)
    }
  }

  const handleDeleteResource = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return

    try {
      const result = await deleteResource(resourceId, 'project_plan')
      if (result.success) {
        setResources(resources.filter(r => r.id !== resourceId))
      } else {
        alert('Error deleting resource: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Error deleting resource: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resources</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resource Summary
        </label>
        <textarea
          value={formData.resource_summary || ''}
          onChange={(e) => onChange('resource_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter resource requirements summary"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resource Details</h3>
          {mode !== 'view' && planId && (
            <button
              onClick={() => {
                setEditingResource(null)
                setShowResourceForm(true)
              }}
              className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </button>
          )}
        </div>

        {showResourceForm && (
          <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <ResourceForm
              resource={editingResource}
              onSubmit={handleAddResource}
              onCancel={() => {
                setShowResourceForm(false)
                setEditingResource(null)
              }}
              planType="project_plan"
            />
          </div>
        )}

        {resources.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No resources added yet. {mode !== 'view' && planId && 'Click "Add Resource" to add one.'}
          </p>
        ) : (
          <div className="space-y-3">
            {resources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onDelete={mode !== 'view' ? () => handleDeleteResource(resource.id) : null}
                onEdit={mode !== 'view' ? () => {
                  setEditingResource(resource)
                  setShowResourceForm(true)
                } : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
