/**
 * Risk Responses Panel Component
 * List and manage response actions for a risk
 */

import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { getResponsesByRisk, createResponse, updateResponse, deleteResponse, completeResponse } from '../../services/riskResponseService'
import ResponseCard from './ResponseCard'
import ResponseForm from './ResponseForm'

export default function RiskResponsesPanel({ riskId, onUpdate }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingResponse, setEditingResponse] = useState(null)

  useEffect(() => {
    if (riskId) {
      loadResponses()
    }
  }, [riskId])

  const loadResponses = async () => {
    try {
      setLoading(true)
      const result = await getResponsesByRisk(riskId)
      if (result.success) {
        setResponses(result.data || [])
      }
    } catch (error) {
      console.error('Error loading responses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveResponse = async () => {
    await loadResponses()
    setShowForm(false)
    setEditingResponse(null)
    if (onUpdate) onUpdate()
  }

  const handleEdit = (response) => {
    setEditingResponse(response)
    setShowForm(true)
  }

  const handleDelete = async (responseId) => {
    if (!confirm('Are you sure you want to delete this response action?')) {
      return
    }

    try {
      const result = await deleteResponse(responseId)
      if (result.success) {
        await loadResponses()
        if (onUpdate) onUpdate()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting response:', error)
      alert('Error: ' + error.message)
    }
  }

  const handleComplete = async (responseId, notes) => {
    try {
      const result = await completeResponse(responseId, notes)
      if (result.success) {
        await loadResponses()
        if (onUpdate) onUpdate()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error completing response:', error)
      alert('Error: ' + error.message)
    }
  }

  const completedCount = responses.filter(r => r.status === 'completed').length
  const totalCount = responses.length
  const pendingCount = responses.filter(r => r.status === 'planned' || r.status === 'in_progress').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Response Actions
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {totalCount > 0 ? (
              <span>
                {completedCount} of {totalCount} complete
                {pendingCount > 0 && `, ${pendingCount} pending`}
              </span>
            ) : (
              'No response actions defined yet'
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingResponse(null)
            setShowForm(true)
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Response Action
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading responses...
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No response actions have been defined for this risk.
          </p>
          <button
            onClick={() => {
              setEditingResponse(null)
              setShowForm(true)
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Add First Response Action
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              onEdit={() => handleEdit(response)}
              onDelete={() => handleDelete(response.id)}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ResponseForm
          riskId={riskId}
          response={editingResponse}
          onSave={handleSaveResponse}
          onCancel={() => {
            setShowForm(false)
            setEditingResponse(null)
          }}
        />
      )}
    </div>
  )
}
