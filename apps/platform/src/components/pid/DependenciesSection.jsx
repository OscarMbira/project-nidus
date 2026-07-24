/**
 * PID Dependencies Section Component
 * Displays and manages PID dependencies
 */

import { useState, useEffect } from 'react'
import { Plus, Link } from 'lucide-react'
import { getDependencies, deleteDependency } from '../../services/pidDependenciesService'
import DependencyCard from './DependencyCard'
import DependencyForm from './DependencyForm'

export default function DependenciesSection({ pidId, mode = 'view' }) {
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDependency, setSelectedDependency] = useState(null)

  useEffect(() => {
    if (pidId) {
      loadDependencies()
    }
  }, [pidId])

  const loadDependencies = async () => {
    try {
      setLoading(true)
      const result = await getDependencies(pidId)
      if (result.success) {
        setDependencies(result.data || [])
      }
    } catch (error) {
      console.error('Error loading dependencies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedDependency(null)
    setShowForm(true)
  }

  const handleEdit = (dependency) => {
    setSelectedDependency(dependency)
    setShowForm(true)
  }

  const handleDelete = async (dependencyId) => {
    if (!confirm('Are you sure you want to delete this dependency?')) {
      return
    }

    try {
      const result = await deleteDependency(dependencyId)
      if (result.success) {
        await loadDependencies()
      } else {
        alert('Error deleting dependency: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting dependency:', error)
      alert('Error deleting dependency: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedDependency(null)
    loadDependencies()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dependencies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Dependencies</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            External and internal dependencies that the project relies on
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Dependency
          </button>
        )}
      </div>

      {showForm && (
        <DependencyForm
          pidId={pidId}
          dependency={selectedDependency}
          mode={selectedDependency ? 'edit' : 'create'}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedDependency(null)
          }}
        />
      )}

      {dependencies.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Link className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Dependencies Defined
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add project dependencies that the project relies on
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Dependency
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {dependencies.map((dependency) => (
            <DependencyCard
              key={dependency.id}
              dependency={dependency}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(dependency) : null}
              onDelete={mode !== 'view' ? () => handleDelete(dependency.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
