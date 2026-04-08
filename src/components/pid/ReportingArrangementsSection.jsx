/**
 * PID Reporting Arrangements Section Component
 * Displays and manages PID reporting arrangements
 */

import { useState, useEffect } from 'react'
import { Plus, FileText } from 'lucide-react'
import { getReportingArrangements, deleteReportingArrangement } from '../../services/pidReportingArrangementsService'
import ReportingArrangementCard from './ReportingArrangementCard'
import ReportingArrangementForm from './ReportingArrangementForm'

export default function ReportingArrangementsSection({ pidId, mode = 'view', projectId }) {
  const [arrangements, setArrangements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedArrangement, setSelectedArrangement] = useState(null)

  useEffect(() => {
    if (pidId) {
      loadArrangements()
    }
  }, [pidId])

  const loadArrangements = async () => {
    try {
      setLoading(true)
      const result = await getReportingArrangements(pidId)
      if (result.success) {
        setArrangements(result.data || [])
      }
    } catch (error) {
      console.error('Error loading reporting arrangements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedArrangement(null)
    setShowForm(true)
  }

  const handleEdit = (arrangement) => {
    setSelectedArrangement(arrangement)
    setShowForm(true)
  }

  const handleDelete = async (arrangementId) => {
    if (!confirm('Are you sure you want to delete this reporting arrangement?')) {
      return
    }

    try {
      const result = await deleteReportingArrangement(arrangementId)
      if (result.success) {
        await loadArrangements()
      } else {
        alert('Error deleting arrangement: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting arrangement:', error)
      alert('Error deleting arrangement: ' + error.message)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedArrangement(null)
    loadArrangements()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading reporting arrangements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reporting Arrangements</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define reporting arrangements for different report types
          </p>
        </div>
        {mode !== 'view' && (
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Arrangement
          </button>
        )}
      </div>

      {showForm && (
        <ReportingArrangementForm
          pidId={pidId}
          arrangement={selectedArrangement}
          mode={selectedArrangement ? 'edit' : 'create'}
          projectId={projectId}
          onSave={handleFormClose}
          onCancel={() => {
            setShowForm(false)
            setSelectedArrangement(null)
          }}
        />
      )}

      {arrangements.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Reporting Arrangements Defined
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add reporting arrangements for different report types
          </p>
          {mode !== 'view' && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Arrangement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {arrangements.map((arrangement) => (
            <ReportingArrangementCard
              key={arrangement.id}
              arrangement={arrangement}
              mode={mode}
              onEdit={mode !== 'view' ? () => handleEdit(arrangement) : null}
              onDelete={mode !== 'view' ? () => handleDelete(arrangement.id) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
