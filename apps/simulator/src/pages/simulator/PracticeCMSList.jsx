/**
 * Practice Communication Management Strategy List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare, Plus, Edit } from 'lucide-react'
import { getPracticeCMS, createPracticeCMS, updatePracticeCMS } from '../../services/sim/practiceCMSService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_CMS_COLUMNS = [
  { key: 'cms_reference', label: 'Reference' },
  { key: 'purpose', label: 'Purpose' }
]

export default function PracticeCMSList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [cms, setCms] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    cms_reference: `CMS-${Date.now()}`,
    purpose: '',
    objectives: '',
    scope: ''
  })

  useEffect(() => {
    if (projectId) loadCMS()
  }, [projectId])

  const loadCMS = async () => {
    try {
      setLoading(true)
      const result = await getPracticeCMS(projectId)
      if (result.success) {
        setCms(result.data)
        if (result.data) setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading CMS:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (cms) {
        result = await updatePracticeCMS(cms.id, formData)
      } else {
        result = await createPracticeCMS(projectId, formData)
      }
      if (result.success) {
        setCms(result.data)
        setEditing(false)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving CMS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Communication Management Strategy</h1>
        <div className="flex gap-2">
          {cms && <ExportListMenu columns={PRACTICE_CMS_COLUMNS} data={[cms]} baseFilename="PracticeCMS" />}
          {cms && !editing && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 border rounded-lg">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </button>
          )}
        </div>
      </div>

      {!cms && !editing ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 mb-4">No CMS found</p>
          <button onClick={() => setEditing(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <Plus className="h-4 w-4 mr-2" /> Create CMS
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Purpose</label>
            <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => { setEditing(false); if (cms) setFormData(cms) }} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Purpose</h3>
            <p className="text-gray-600 dark:text-gray-400">{cms.purpose || 'N/A'}</p>
          </div>
          <button onClick={() => navigate(`/simulator/practice-cms/${cms.id}?projectId=${projectId}`)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Full Strategy
          </button>
        </div>
      )}
    </div>
  )
}
