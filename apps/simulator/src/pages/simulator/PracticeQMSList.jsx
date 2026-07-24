/**
 * Practice Quality Management Strategy List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckSquare, Plus, Edit } from 'lucide-react'
import { getPracticeQMS, createPracticeQMS, updatePracticeQMS } from '../../services/sim/practiceQMSService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_QMS_COLUMNS = [
  { key: 'strategy_name', label: 'Name' },
  { key: 'strategy_description', label: 'Description' }
]

export default function PracticeQMSList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [qms, setQms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    strategy_name: '',
    strategy_description: '',
    quality_approach: ''
  })

  useEffect(() => {
    if (projectId) loadQMS()
  }, [projectId])

  const loadQMS = async () => {
    try {
      setLoading(true)
      const result = await getPracticeQMS(projectId)
      if (result.success) {
        setQms(result.data)
        if (result.data) setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading QMS:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (qms) {
        result = await updatePracticeQMS(qms.id, formData)
      } else {
        result = await createPracticeQMS(projectId, formData)
      }
      if (result.success) {
        setQms(result.data)
        setEditing(false)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving QMS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Quality Management Strategy</h1>
        <div className="flex gap-2">
          {qms && <ExportListMenu columns={PRACTICE_QMS_COLUMNS} data={[qms]} baseFilename="PracticeQMS" />}
          {qms && !editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
          )}
        </div>
      </div>

      {!qms && !editing ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">No QMS found</p>
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> Create QMS
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Strategy Name *</label>
            <input type="text" required value={formData.strategy_name} onChange={(e) => setFormData({ ...formData, strategy_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => { setEditing(false); if (qms) setFormData(qms) }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Strategy Name</h3>
            <p className="text-gray-600 dark:text-gray-400">{qms.strategy_name}</p>
          </div>
          <button onClick={() => navigate(`/simulator/practice-qms/${qms.id}?projectId=${projectId}`)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Full Strategy
          </button>
        </div>
      )}
    </div>
  )
}
