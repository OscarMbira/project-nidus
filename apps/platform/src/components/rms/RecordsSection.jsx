/**
 * Risk Records Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getRecords } from '../../services/rmsRecordsService'

export default function RecordsSection({ rmsId, readOnly = false }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadRecords()
    }
  }, [rmsId])

  const loadRecords = async () => {
    try {
      setLoading(true)
      const result = await getRecords(rmsId)
      if (result.success) {
        setRecords(result.data || [])
      }
    } catch (error) {
      console.error('Error loading records:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Risk Records
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Risk management records to be maintained
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading records...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No risk records defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{record.record_name}</h4>
                {record.is_mandatory && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                    Mandatory
                  </span>
                )}
              </div>
              {record.record_description && <p className="text-gray-700 dark:text-gray-300 mb-2">{record.record_description}</p>}
              {record.storage_location && (
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Storage:</strong> {record.storage_location}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
