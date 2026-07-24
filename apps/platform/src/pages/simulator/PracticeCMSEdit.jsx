/**
 * Practice CMS Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeCMS, updatePracticeCMS } from '../../services/sim/practiceCMSService'

export default function PracticeCMSEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    purpose: '',
    objectives: '',
    scope: ''
  })

  useEffect(() => {
    if (id) loadCMS()
  }, [id])

  const loadCMS = async () => {
    try {
      setLoading(true)
      const result = await getPracticeCMS(projectId)
      if (result.success && result.data) setFormData(result.data)
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
      const result = await updatePracticeCMS(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-cms/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating CMS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-cms/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice CMS</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Purpose</label>
          <textarea value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-cms/${id}?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
