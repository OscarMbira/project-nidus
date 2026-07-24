/**
 * Relationship Form Component
 * Form for creating relationships between configuration items
 */

import { useState, useEffect } from 'react'
import { Link2 } from 'lucide-react'
import { getConfigurationItemsByProject } from '../../services/configurationItemRecordService'

export default function RelationshipForm({ projectId, itemId, onSubmit, onCancel, saving = false }) {
  const [relationshipData, setRelationshipData] = useState({
    child_item_id: '',
    relationship_type: 'depends_on',
    relationship_description: ''
  })
  const [availableItems, setAvailableItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (projectId) {
      fetchItems()
    }
  }, [projectId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const items = await getConfigurationItemsByProject(projectId)
      // Filter out the current item
      setAvailableItems(items.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!relationshipData.child_item_id) {
      newErrors.child_item_id = 'Please select a related configuration item'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit({
      parent_item_id: itemId,
      child_item_id: relationshipData.child_item_id,
      relationship_type: relationshipData.relationship_type,
      relationship_description: relationshipData.relationship_description
    })
  }

  const relationshipTypes = [
    { value: 'contains', label: 'Contains' },
    { value: 'depends_on', label: 'Depends On' },
    { value: 'supersedes', label: 'Supersedes' },
    { value: 'replaces', label: 'Replaces' },
    { value: 'composed_of', label: 'Composed Of' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Related Configuration Item <span className="text-red-500">*</span>
        </label>
        <select
          value={relationshipData.child_item_id}
          onChange={(e) => setRelationshipData({ ...relationshipData, child_item_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={loading}
        >
          <option value="">Select configuration item...</option>
          {availableItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.configuration_item_identifier} - {item.item_name}
            </option>
          ))}
        </select>
        {errors.child_item_id && (
          <p className="text-red-500 text-sm mt-1">{errors.child_item_id}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Relationship Type <span className="text-red-500">*</span>
        </label>
        <select
          value={relationshipData.relationship_type}
          onChange={(e) => setRelationshipData({ ...relationshipData, relationship_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {relationshipTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={relationshipData.relationship_description}
          onChange={(e) => setRelationshipData({ ...relationshipData, relationship_description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Describe the relationship..."
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating...' : 'Create Relationship'}
        </button>
      </div>
    </form>
  )
}
