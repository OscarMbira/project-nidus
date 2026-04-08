/**
 * PPD Distribution Component
 * Displays and manages distribution list
 */

import { useState, useEffect } from 'react'
import { Mail, User, Calendar, Plus } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function PPDDistribution({ ppdId, mode = 'view' }) {
  const [distribution, setDistribution] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ppdId) {
      loadDistribution()
    }
  }, [ppdId])

  const loadDistribution = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ppd_distribution')
        .select(`
          *,
          recipient:recipient_id(id, full_name, email)
        `)
        .eq('ppd_id', ppdId)
        .order('date_of_issue', { ascending: false })

      if (error) throw error
      setDistribution(data || [])
    } catch (error) {
      console.error('Error loading distribution:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading distribution list...</p>
        </div>
      </div>
    )
  }

  if (distribution.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Mail className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Distribution List
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Distribution records will appear here when PPD is distributed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribution List</h3>
      <div className="space-y-3">
        {distribution.map((dist) => (
          <div
            key={dist.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {dist.recipient?.full_name || dist.recipient_name || 'Unknown'}
                    </h4>
                    {dist.recipient?.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {dist.recipient.email}
                      </p>
                    )}
                  </div>
                </div>
                {dist.recipient_title && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {dist.recipient_title}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Issued: {new Date(dist.date_of_issue).toLocaleDateString()}
                  </span>
                  {dist.version_distributed && (
                    <span>Version: {dist.version_distributed}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
