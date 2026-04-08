/**
 * Practice QMS Create Page
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticeQMS } from '../../services/sim/practiceQMSService'

export default function PracticeQMSCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    strategy_name: '',
    strategy_description: '',
    quality_approach: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticeQMS(projectId, formData)
      if (result.success) {
        navigate(`/simulator/practice-qms/${result.data.id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating QMS:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-qms?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Practice QMS</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Strategy Name *</label>
          <input type="text" required value={formData.strategy_name} onChange={(e) => setFormData({ ...formData, strategy_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-qms?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create QMS'}</button>
        </div>
      </form>
    </div>
  )
}
