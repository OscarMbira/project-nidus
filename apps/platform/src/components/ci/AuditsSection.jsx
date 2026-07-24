/**
 * Audits Section Component
 * Displays configuration audits list
 */

import { useState, useEffect } from 'react'
import { Shield, Plus } from 'lucide-react'
import { getAuditsByProject } from '../../services/configurationItemAuditService'
import AuditCard from './AuditCard'

export default function AuditsSection({ projectId, onCreate }) {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchAudits()
    }
  }, [projectId])

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const data = await getAuditsByProject(projectId)
      setAudits(data || [])
    } catch (error) {
      console.error('Error fetching audits:', error)
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
          <Shield className="h-5 w-5" />
          Configuration Audits
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {audits.length} audit{audits.length !== 1 ? 's' : ''}
          </span>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Audit
            </button>
          )}
        </div>
      </div>

      {audits.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No audits yet</p>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Create First Audit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <AuditCard key={audit.id} audit={audit} />
          ))}
        </div>
      )}
    </div>
  )
}
