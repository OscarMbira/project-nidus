/**
 * Brief Revision History Component
 * Version history display
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { Calendar, User } from 'lucide-react'

export default function BriefRevisionHistory({ briefId }) {
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (briefId) {
      loadRevisions()
    }
  }, [briefId])

  const loadRevisions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('brief_revision_history')
        .select(`
          *,
          revised_by_user:users!brief_revision_history_revised_by_fkey(id, full_name, email)
        `)
        .eq('brief_id', briefId)
        .order('revision_date', { ascending: false })

      if (error) throw error
      setRevisions(data || [])
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before viewing revision history
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading revision history...</div>
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No revision history available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revision History</h3>
      <div className="space-y-3">
        {revisions.map((revision) => (
          <div
            key={revision.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Version {revision.revision_date ? new Date(revision.revision_date).toLocaleDateString() : 'N/A'}
                  </p>
                  {revision.previous_revision_date && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Previous: {new Date(revision.previous_revision_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>
                  {revision.revised_by_user?.full_name || 'Unknown'}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Summary of Changes:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {revision.summary_of_changes}
              </p>
            </div>
            {revision.changes_marked && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm text-gray-600 dark:text-gray-400">
                <strong>Tracked Changes:</strong> {revision.changes_marked}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
