/**
 * Methods Section Component
 * Communication methods list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getMethods, addMethod, updateMethod, deleteMethod } from '../../services/cmsCommunicationMethodsService'
import MethodCard from './MethodCard'
import MethodForm from './MethodForm'

export default function MethodsSection({ cmsId, readOnly = false }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    method_name: '',
    method_type: '',
    method_description: '',
    when_to_use: '',
    entry_criteria: '',
    exit_criteria: '',
    required_participants: '',
    documentation_required: '',
    is_mandatory: false
  })

  useEffect(() => {
    if (cmsId) {
      loadMethods()
    }
  }, [cmsId])

  const loadMethods = async () => {
    try {
      setLoading(true)
      const data = await getMethods(cmsId)
      setMethods(data || [])
    } catch (error) {
      console.error('Error loading methods:', error)
      alert('Error loading methods: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateMethod(editingId, formData)
      } else {
        await addMethod(cmsId, formData)
      }
      await loadMethods()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving method:', error)
      alert('Error saving method: ' + error.message)
    }
  }

  const handleEdit = (method) => {
    setFormData({
      method_name: method.method_name || '',
      method_type: method.method_type || '',
      method_description: method.method_description || '',
      when_to_use: method.when_to_use || '',
      entry_criteria: method.entry_criteria || '',
      exit_criteria: method.exit_criteria || '',
      required_participants: method.required_participants || '',
      documentation_required: method.documentation_required || '',
      is_mandatory: method.is_mandatory || false
    })
    setEditingId(method.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this method?')) return
    try {
      await deleteMethod(id)
      await loadMethods()
    } catch (error) {
      console.error('Error deleting method:', error)
      alert('Error deleting method: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      method_name: '',
      method_type: '',
      method_description: '',
      when_to_use: '',
      entry_criteria: '',
      exit_criteria: '',
      required_participants: '',
      documentation_required: '',
      is_mandatory: false
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding methods
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Methods
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define communication methods following IAP2 engagement spectrum
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Method
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <MethodForm
          methodData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Methods List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading methods...</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No communication methods defined yet.</p>
          <p className="text-sm mt-1">Add at least one method to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <MethodCard
              key={method.id}
              method={method}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
