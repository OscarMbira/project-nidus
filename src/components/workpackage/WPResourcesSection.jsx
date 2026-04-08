/**
 * Work Package Resources Section Component
 * Displays and manages Work Package resources
 */

import { useState, useEffect } from 'react'
import { Plus, Briefcase } from 'lucide-react'
import { getResources, deleteResource } from '../../services/wpResourcesService'
import WPResourceCard from './WPResourceCard'
import WPResourceForm from './WPResourceForm'

export default function WPResourcesSection({ wpId, mode = 'view' }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)

  useEffect(() => {
    if (wpId) {
      loadResources()
    }
  }, [wpId])

  const loadResources = async () => {
    try {
      setLoading(true)
      const result = await getResources(wpId)
      if (result.success) {
        setResources(result.data || [])
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedResource(null)
    setShowForm(true)
  }

  const handleEdit = (resource) => {
    setSelectedResource(resource)
    setShowForm(true)
  }

  const handleDelete = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return
    }

    try {
      const result = await deleteResource(resourceId)
      if (result.success) {
        await loadResources()
      } else {
        alert('Error deleting resource: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Error deleting resource: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedResource(null)
    loadResources()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resources Required</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Resources needed to complete this work package
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </button>
        )}
      </div>

      {showForm && (
        <WPResourceForm
          wpId={wpId}
          resource={selectedResource}
          mode={selectedResource ? 'edit' : 'create'}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedResource(null)
          }}
        />
      )}

      {resources.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Briefcase className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Resources Defined
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add resources required to complete this work package
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((resource) => (
            <WPResourceCard
              key={resource.id}
              resource={resource}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(resource) : null}
              onDelete={mode !== 'view' ? () => handleDelete(resource.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
