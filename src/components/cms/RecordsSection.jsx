/**
 * Records Section Component
 * Communication records list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getRecords, addRecord, updateRecord, deleteRecord } from '../../services/cmsCommunicationRecordsService'
import RecordCard from './RecordCard'
import RecordForm from './RecordForm'

export default function RecordsSection({ cmsId, readOnly = false }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    record_name: '',
    record_type: '',
    record_description: '',
    record_purpose: '',
    storage_location: '',
    retention_period: '',
    access_control: '',
    format_requirements: '',
    is_mandatory: true
  })

  useEffect(() => {
    if (cmsId) {
      loadRecords()
    }
  }, [cmsId])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const data = await getRecords(cmsId)
      setRecords(data || [])
    } catch (error) {
      console.error('Error loading records:', error)
      alert('Error loading records: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateRecord(editingId, formData)
      } else {
        await addRecord(cmsId, formData)
      }
      await loadRecords()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving record:', error)
      alert('Error saving record: ' + error.message)
    }
  }

  const handleEdit = (record) => {
    setFormData({
      record_name: record.record_name || '',
      record_type: record.record_type || '',
      record_description: record.record_description || '',
      record_purpose: record.record_purpose || '',
      storage_location: record.storage_location || '',
      retention_period: record.retention_period || '',
      access_control: record.access_control || '',
      format_requirements: record.format_requirements || '',
      is_mandatory: record.is_mandatory !== undefined ? record.is_mandatory : true
    })
    setEditingId(record.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      await deleteRecord(id)
      await loadRecords()
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Error deleting record: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      record_name: '',
      record_type: '',
      record_description: '',
      record_purpose: '',
      storage_location: '',
      retention_period: '',
      access_control: '',
      format_requirements: '',
      is_mandatory: true
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
        Please save the CMS first before adding records
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Records
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define the communication records to be maintained (Communication Register, meeting minutes, etc.)
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Record
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <RecordForm
          recordData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Records List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading records...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No communication records defined yet.</p>
          <p className="text-sm mt-1">Add records to define what communication information will be maintained.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
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
