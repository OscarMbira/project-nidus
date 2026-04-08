/**
 * Standards Section Component
 * Communication standards list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getStandards, addStandard, updateStandard, deleteStandard } from '../../services/cmsCommunicationStandardsService'
import StandardCard from './StandardCard'
import StandardForm from './StandardForm'

export default function StandardsSection({ cmsId, readOnly = false }) {
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    standard_name: '',
    standard_type: '',
    standard_description: '',
    applicability: '',
    compliance_level: 'recommended',
    template_reference: '',
    external_link: ''
  })

  useEffect(() => {
    if (cmsId) {
      loadStandards()
    }
  }, [cmsId])

  const loadStandards = async () => {
    try {
      setLoading(true)
      const data = await getStandards(cmsId)
      setStandards(data || [])
    } catch (error) {
      console.error('Error loading standards:', error)
      alert('Error loading standards: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateStandard(editingId, formData)
      } else {
        await addStandard(cmsId, formData)
      }
      await loadStandards()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving standard:', error)
      alert('Error saving standard: ' + error.message)
    }
  }

  const handleEdit = (standard) => {
    setFormData({
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
      await deleteStandard(id)
      await loadStandards()
    } catch (error) {
      console.error('Error deleting standard:', error)
      alert('Error deleting standard: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
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

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding standards
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Standards
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define communication standards (branding, tone, format, language, accessibility)
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
          <p>No communication standards defined yet.</p>
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
