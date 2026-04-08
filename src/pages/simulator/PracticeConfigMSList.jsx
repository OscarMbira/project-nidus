/**
 * Practice Configuration Management Strategy List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, Plus, Edit } from 'lucide-react'
import { getPracticeConfigMS, createPracticeConfigMS, updatePracticeConfigMS } from '../../services/sim/practiceConfigMSService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_CONFIG_MS_COLUMNS = [
  { key: 'cfgms_reference', label: 'Reference' },
  { key: 'purpose', label: 'Purpose' }
]

export default function PracticeConfigMSList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [configMs, setConfigMs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    cfgms_reference: `CFGMS-${Date.now()}`,
    purpose: '',
    objectives: '',
    scope: ''
  })

  useEffect(() => {
    if (projectId) loadConfigMS()
  }, [projectId])

  const loadConfigMS = async () => {
    try {
      setLoading(true)
      const result = await getPracticeConfigMS(projectId)
      if (result.success) {
        setConfigMs(result.data)
        if (result.data) setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading Config MS:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (configMs) {
        result = await updatePracticeConfigMS(configMs.id, formData)
      } else {
        result = await createPracticeConfigMS(projectId, formData)
      }
      if (result.success) {
        setConfigMs(result.data)
        setEditing(false)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving Config MS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Configuration Management Strategy</h1>
        <div className="flex gap-2">
          {configMs && <ExportListMenu columns={PRACTICE_CONFIG_MS_COLUMNS} data={[configMs]} baseFilename="PracticeConfigMS" />}
          {configMs && !editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
          )}
        </div>
      </div>

      {!configMs && !editing ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">No Config MS found</p>
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> Create Config MS
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Purpose</label>
            <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => { setEditing(false); if (configMs) setFormData(configMs) }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Purpose</h3>
            <p className="text-gray-600 dark:text-gray-400">{configMs.purpose || 'N/A'}</p>
          </div>
          <button onClick={() => navigate(`/simulator/practice-config-ms/${configMs.id}?projectId=${projectId}`)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Full Strategy
          </button>
        </div>
      )}
    </div>
  )
}
