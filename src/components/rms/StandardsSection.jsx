/**
 * Risk Standards Section Component
 * Risk standards list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getStandards, addStandard, updateStandard, deleteStandard } from '../../services/rmsRiskStandardsService'
import StandardCard from './StandardCard'
import StandardForm from './StandardForm'

export default function StandardsSection({ rmsId, readOnly = false, onUpdate }) {
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    standard_code: '',
    standard_name: '',
    standard_type: '',
    standard_description: '',
    applicability: '',
    compliance_level: 'recommended',
    template_reference: '',
    external_link: ''
  })

  useEffect(() => {
    if (rmsId) {
      loadStandards()
    }
  }, [rmsId])

  const loadStandards = async () => {
    try {
      setLoading(true)
      const result = await getStandards(rmsId)
      if (result.success) {
        setStandards(result.data || [])
      } else {
        console.error('Error loading standards:', result.error)
        alert('Error loading standards: ' + result.error)
      }
    } catch (error) {
      console.error('Error loading standards:', error)
      alert('Error loading standards: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      let result
      if (editingId) {
        result = await updateStandard(editingId, formData)
      } else {
        result = await addStandard(rmsId, formData)
      }
      
      if (result.success) {
        await loadStandards()
        setShowForm(false)
        setEditingId(null)
        resetForm()
        if (onUpdate) onUpdate()
      } else {
        alert('Error saving standard: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving standard:', error)
      alert('Error saving standard: ' + error.message)
    }
  }

  const handleEdit = (standard) => {
    setFormData({
      standard_code: standard.standard_code || '',
      standard_name: standard.standard_name || '',
      standard_type: standard.standard_type || '',
      standard_description: standard.standard_description || '',
      applicability: standard.applicability || '',
      compliance_level: standard.compliance_level || 'recommended',
      template_reference: standard.template_reference || '',
      external_link: standard.external_link || ''
    })
    setEditingId(standard.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this standard?')) return
    try {
      const result = await deleteStandard(id)
      if (result.success) {
        await loadStandards()
        if (onUpdate) onUpdate()
      } else {
        alert('Error deleting standard: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting standard:', error)
      alert('Error deleting standard: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      standard_code: '',
      standard_name: '',
      standard_type: '',
      standard_description: '',
      applicability: '',
      compliance_level: 'recommended',
      template_reference: '',
      external_link: ''
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
        Please save the RMS first before adding standards
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Risk Management Standards
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define risk management standards to be applied (ISO 31000, PMBOK, PRINCE2, M_o_R, etc.)
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Standard
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <StandardForm
          standardData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Standards List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading standards...</div>
      ) : standards.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No risk management standards defined yet.</p>
          {!readOnly && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Your First Standard
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {standards.map((standard) => (
            <StandardCard
              key={standard.id}
              standard={standard}
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
