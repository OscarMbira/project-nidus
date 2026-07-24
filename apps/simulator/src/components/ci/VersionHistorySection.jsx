/**
 * Version History Section Component
 * Displays version history for a configuration item
 */

import { useState, useEffect } from 'react'
import { GitBranch, Calendar, User, FileText } from 'lucide-react'
import { getVersionsByItem } from '../../services/configurationItemVersionService'
import VersionCard from './VersionCard'

export default function VersionHistorySection({ itemId }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (itemId) {
      fetchVersions()
    }
  }, [itemId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const data = await getVersionsByItem(itemId)
      setVersions(data || [])
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Version History
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No versions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <VersionCard key={version.id} version={version} />
          ))}
        </div>
      )}
    </div>
  )
}
