/**
 * Relationships Section Component
 * Displays relationships for a configuration item
 */

import { useState, useEffect } from 'react'
import { Link2, Plus } from 'lucide-react'
import { getRelationshipsByItem } from '../../services/configurationItemRelationshipService'

export default function RelationshipsSection({ itemId, onCreate }) {
  const [relationships, setRelationships] = useState({ parentItems: [], childItems: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (itemId) {
      fetchRelationships()
    }
  }, [itemId])

  const fetchRelationships = async () => {
    try {
      setLoading(true)
      const data = await getRelationshipsByItem(itemId)
      setRelationships(data || { parentItems: [], childItems: [] })
    } catch (error) {
      console.error('Error fetching relationships:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRelationshipTypeLabel = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const totalRelationships = relationships.parentItems.length + relationships.childItems.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Relationships
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalRelationships} relationship{totalRelationships !== 1 ? 's' : ''}
          </span>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Relationship
            </button>
          )}
        </div>
      </div>

      {totalRelationships === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No relationships defined</p>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Add Relationship
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {relationships.parentItems.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Parent Items
              </h4>
              <div className="space-y-2">
                {relationships.parentItems.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {rel.parent_item?.item_name || rel.parent_item?.configuration_item_identifier}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {rel.parent_item?.configuration_item_identifier}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs">
                        {getRelationshipTypeLabel(rel.relationship_type)}
                      </span>
                    </div>
                    {rel.relationship_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {rel.relationship_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {relationships.childItems.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Child Items
              </h4>
              <div className="space-y-2">
                {relationships.childItems.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {rel.child_item?.item_name || rel.child_item?.configuration_item_identifier}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {rel.child_item?.configuration_item_identifier}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-xs">
                        {getRelationshipTypeLabel(rel.relationship_type)}
                      </span>
                    </div>
                    {rel.relationship_description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {rel.relationship_description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
