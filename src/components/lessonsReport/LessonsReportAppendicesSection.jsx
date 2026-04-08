/**
 * Lessons Report Appendices Section
 * Supporting materials and references
 */

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, FileText, Link as LinkIcon } from 'lucide-react'
import { getAppendices, addAppendix, updateAppendix, deleteAppendix } from '../../services/lessonsReportAppendixService'

export default function LessonsReportAppendicesSection({
  reportId,
  readOnly = false
}) {
  const [appendices, setAppendices] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    appendix_title: '',
    appendix_type: 'other',
    content: '',
    document_url: '',
    references: []
  })

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadAppendices()
    }
  }, [reportId])

  const loadAppendices = async () => {
    try {
      setLoading(true)
      const result = await getAppendices(reportId)
      if (result.success) {
        setAppendices(result.data || [])
      }
    } catch (error) {
      console.error('Error loading appendices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      let result

      if (editingId) {
        result = await updateAppendix(editingId, formData)
      } else {
        result = await addAppendix(reportId, formData)
      }

      if (result.success) {
        await loadAppendices()
        setShowAddForm(false)
        setEditingId(null)
        setFormData({
          appendix_title: '',
          appendix_type: 'other',
          content: '',
          document_url: '',
          references: []
        })
      } else {
        alert('Error saving appendix: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving appendix:', error)
      alert('Error saving appendix: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this appendix?')) return

    try {
      const result = await deleteAppendix(id)
      if (result.success) {
        await loadAppendices()
      }
    } catch (error) {
      console.error('Error deleting appendix:', error)
      alert('Error deleting appendix: ' + error.message)
    }
  }

  const handleEdit = (appendix) => {
    setFormData({
      appendix_title: appendix.appendix_title,
      appendix_type: appendix.appendix_type || 'other',
      content: appendix.content || '',
      document_url: appendix.document_url || '',
      references: appendix.references || []
    })
    setEditingId(appendix.id)
    setShowAddForm(true)
  }

  if (reportId === 'new') {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Save the report first to add appendices</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Appendices
        </h3>
        {!readOnly && (
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingId(null)
              setFormData({
                appendix_title: '',
                appendix_type: 'other',
                content: '',
                document_url: '',
                references: []
              })
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Appendix
          </button>
        )}
      </div>

      {/* Appendices List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : appendices.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No appendices added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appendices.map((appendix) => (
            <div
              key={appendix.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {appendix.appendix_title}
                    </h4>
                    <span className="text-xs text-gray-500 capitalize">
                      {appendix.appendix_type}
                    </span>
                  </div>
                  {appendix.content && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {appendix.content.substring(0, 200)}...
                    </p>
                  )}
                  {appendix.document_url && (
                    <a
                      href={appendix.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4" />
                      View Document
                    </a>
                  )}
                  {appendix.references && appendix.references.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">References:</p>
                      <div className="flex flex-wrap gap-1">
                        {appendix.references.map((ref, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(appendix)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(appendix.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Appendix' : 'Add Appendix'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Appendix Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.appendix_title}
                  onChange={(e) => setFormData({ ...formData, appendix_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Appendix title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Appendix Type
                </label>
                <select
                  value={formData.appendix_type}
                  onChange={(e) => setFormData({ ...formData, appendix_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="evidence">Evidence</option>
                  <option value="detailed_lessons">Detailed Lessons</option>
                  <option value="charts">Charts</option>
                  <option value="references">References</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Appendix content (if text-based)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document URL
                </label>
                <input
                  type="url"
                  value={formData.document_url}
                  onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  References (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.references.join(', ')}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value.split(',').map(r => r.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="REF-001, REF-002"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.appendix_title}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
