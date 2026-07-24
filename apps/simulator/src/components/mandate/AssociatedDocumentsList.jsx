import { useState, useCallback, memo } from 'react'
import { Plus, X, FileText, ExternalLink } from 'lucide-react'

/**
 * AssociatedDocumentsList Component
 * Manages individual associated document items with add/remove functionality
 * Stores items as array, converts to/from JSON for database storage
 */

function AssociatedDocumentsList({ documents = [], onChange, errors = {} }) {
  const [newDocument, setNewDocument] = useState({
    document_title: '',
    document_type: 'other',
    document_url: '',
    reference_number: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  // Parse documents from string (JSON) or array
  const parseDocuments = useCallback((items) => {
    if (!items) return []
    if (Array.isArray(items)) return items
    try {
      const parsed = JSON.parse(items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  const documentsArray = parseDocuments(documents)

  const handleAddDocument = useCallback(() => {
    if (!newDocument.document_title?.trim()) return

    const updated = [...documentsArray, { ...newDocument, id: Date.now() }]
    onChange({ target: { name: 'associated_documents', value: JSON.stringify(updated) } })
    setNewDocument({
      document_title: '',
      document_type: 'other',
      document_url: '',
      reference_number: ''
    })
    setShowAddForm(false)
  }, [newDocument, documentsArray, onChange])

  const handleRemoveDocument = useCallback((index) => {
    const updated = documentsArray.filter((_, i) => i !== index)
    onChange({ target: { name: 'associated_documents', value: updated.length > 0 ? JSON.stringify(updated) : '' } })
  }, [documentsArray, onChange])

  const handleUpdateDocument = useCallback((index, updatedDoc) => {
    const updated = [...documentsArray]
    updated[index] = updatedDoc
    onChange({ target: { name: 'associated_documents', value: JSON.stringify(updated) } })
  }, [documentsArray, onChange])

  const getDocumentTypeColor = (type) => {
    switch (type) {
      case 'estimate': return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'risk_assessment': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'feasibility_study': return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'business_case': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Add New Document Button */}
      {!showAddForm && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Associated Document
        </button>
      )}

      {/* Add Document Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDocument.document_title}
              onChange={(e) => setNewDocument(prev => ({ ...prev, document_title: e.target.value }))}
              placeholder="Enter document title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Type
              </label>
              <select
                value={newDocument.document_type}
                onChange={(e) => setNewDocument(prev => ({ ...prev, document_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="estimate">Estimate</option>
                <option value="risk_assessment">Risk Assessment</option>
                <option value="feasibility_study">Feasibility Study</option>
                <option value="business_case">Business Case</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={newDocument.reference_number}
                onChange={(e) => setNewDocument(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Document reference..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document URL
            </label>
            <input
              type="url"
              value={newDocument.document_url}
              onChange={(e) => setNewDocument(prev => ({ ...prev, document_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddDocument}
              disabled={!newDocument.document_title?.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewDocument({
                  document_title: '',
                  document_type: 'other',
                  document_url: '',
                  reference_number: ''
                })
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documentsArray.length > 0 ? (
        <div className="space-y-2">
          {documentsArray.map((doc, index) => (
            <DocumentItem
              key={doc.id || index}
              document={doc}
              index={index}
              onUpdate={handleUpdateDocument}
              onRemove={handleRemoveDocument}
              getDocumentTypeColor={getDocumentTypeColor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No associated documents added yet.
        </div>
      )}

      {/* Error Message */}
      {errors.associated_documents && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.associated_documents}</p>
      )}
    </div>
  )
}

// Memoized Document Item Component
const DocumentItem = memo(function DocumentItem({ document, index, onUpdate, onRemove, getDocumentTypeColor }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 min-w-[24px]">
            {index + 1}.
          </span>
          <h4 className="flex-1 text-gray-900 dark:text-white font-medium">
            {document.document_title}
          </h4>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getDocumentTypeColor(document.document_type)}`}>
            {document.document_type?.replace('_', ' ') || 'other'}
          </span>
        </div>
        <div className="ml-7 space-y-1">
          {document.reference_number && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Ref: {document.reference_number}
            </p>
          )}
          {document.document_url && (
            <a
              href={document.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {document.document_url}
            </a>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Remove document"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default memo(AssociatedDocumentsList)
