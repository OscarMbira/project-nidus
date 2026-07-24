/**
 * References Section
 * Section 9: Links to associated documents
 */

import { useState, useEffect } from 'react'
import { getReferences, addReference, deleteReference } from '../../services/briefReferencesService'
import { Plus, Trash2, ExternalLink } from 'lucide-react'

const REFERENCE_TYPES = [
  { value: 'mandate', label: 'Mandate' },
  { value: 'lesson_learned', label: 'Lesson Learned' },
  { value: 'feasibility_study', label: 'Feasibility Study' },
  { value: 'business_case_outline', label: 'Business Case Outline' },
  { value: 'standard', label: 'Standard' },
  { value: 'policy', label: 'Policy' },
  { value: 'other_project', label: 'Other Project' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' }
]

export default function ReferencesSection({ briefId, readOnly = false }) {
  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    reference_type: 'mandate',
    reference_title: '',
    reference_description: '',
    reference_url: '',
    mandate_id: null
  })

  useEffect(() => {
    if (briefId) {
      loadReferences()
    }
  }, [briefId])

  const loadReferences = async () => {
    try {
      setLoading(true)
      const data = await getReferences(briefId)
      setReferences(data || [])
    } catch (error) {
      console.error('Error loading references:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await addReference(briefId, formData)
      await loadReferences()
      setShowForm(false)
      setFormData({
        reference_type: 'mandate',
        reference_title: '',
        reference_description: '',
        reference_url: '',
        mandate_id: null
      })
    } catch (error) {
      console.error('Error saving reference:', error)
      alert('Error saving reference: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this reference?')) return
    try {
      await deleteReference(id)
      await loadReferences()
    } catch (error) {
      console.error('Error deleting reference:', error)
      alert('Error deleting reference: ' + error.message)
    }
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before adding references
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            9. References
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Links to associated documents, mandates, lessons learned, and other references
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reference
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.reference_type}
                onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {REFERENCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.reference_title}
                onChange={(e) => setFormData({ ...formData, reference_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.reference_description}
              onChange={(e) => setFormData({ ...formData, reference_description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL
            </label>
            <input
              type="url"
              value={formData.reference_url}
              onChange={(e) => setFormData({ ...formData, reference_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="External link (optional)"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add Reference
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormData({
                  reference_type: 'mandate',
                  reference_title: '',
                  reference_description: '',
                  reference_url: '',
                  mandate_id: null
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* References List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : references.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No references added yet. Link to mandate is required.
        </div>
      ) : (
        <div className="space-y-4">
          {references.map((ref, index) => (
            <div
              key={ref.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm capitalize">
                      {ref.reference_type.replace('_', ' ')}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {ref.reference_title}
                    </h3>
                  </div>
                  {ref.reference_description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{ref.reference_description}</p>
                  )}
                  {ref.reference_url && (
                    <a
                      href={ref.reference_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center text-sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      {ref.reference_url}
                    </a>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(ref.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
