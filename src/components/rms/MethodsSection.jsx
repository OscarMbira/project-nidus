/**
 * Risk Identification Methods Section Component
 * Methods list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getMethods, addMethod, updateMethod, deleteMethod } from '../../services/rmsIdentificationMethodsService'
import MethodCard from './MethodCard'
import MethodForm from './MethodForm'

export default function MethodsSection({ rmsId, readOnly = false, onUpdate }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    method_name: '',
    method_type: 'workshop',
    method_description: '',
    when_to_use: '',
    participants_required: '',
    frequency: '',
    documentation_required: '',
    is_mandatory: false
  })

  useEffect(() => {
    if (rmsId) {
      loadMethods()
    }
  }, [rmsId])

  const loadMethods = async () => {
    try {
      setLoading(true)
      const result = await getMethods(rmsId)
      if (result.success) {
        setMethods(result.data || [])
      } else {
        console.error('Error loading methods:', result.error)
        alert('Error loading methods: ' + result.error)
      }
    } catch (error) {
      console.error('Error loading methods:', error)
      alert('Error loading methods: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      let result
      if (editingId) {
        result = await updateMethod(editingId, formData)
      } else {
        result = await addMethod(rmsId, formData)
      }
      
      if (result.success) {
        await loadMethods()
        setShowForm(false)
        setEditingId(null)
        resetForm()
      } else {
        alert('Error saving method: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving method:', error)
      alert('Error saving method: ' + error.message)
    }
  }

  const handleEdit = (method) => {
    setFormData({
      method_name: method.method_name || '',
      method_type: method.method_type || 'workshop',
      method_description: method.method_description || '',
      when_to_use: method.when_to_use || '',
      participants_required: method.participants_required || '',
      frequency: method.frequency || '',
      documentation_required: method.documentation_required || '',
      is_mandatory: method.is_mandatory || false
    })
    setEditingId(method.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this method?')) return
    try {
      const result = await deleteMethod(id)
      if (result.success) {
        await loadMethods()
        if (onUpdate) onUpdate()
      } else {
        alert('Error deleting method: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting method:', error)
      alert('Error deleting method: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      method_name: '',
      method_type: 'workshop',
      method_description: '',
      when_to_use: '',
      participants_required: '',
      frequency: '',
      documentation_required: '',
      is_mandatory: false
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!rmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the RMS first before adding methods
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Risk Identification Methods
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define methods for identifying risks (workshops, checklists, interviews, etc.)
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
          <p>No risk identification methods defined yet.</p>
          {!readOnly && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Your First Method
            </button>
          )}
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
