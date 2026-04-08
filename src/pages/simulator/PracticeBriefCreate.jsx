/**
 * Practice Brief Create Page
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticeBrief } from '../../services/sim/practiceBriefService'

export default function PracticeBriefCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    brief_title: '',
    brief_description: '',
    project_definition: '',
    project_scope: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticeBrief(projectId, formData)
      if (result.success) {
        navigate(`/simulator/practice-briefs/${result.data.id}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating brief:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-briefs?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Practice Brief</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Brief Title *</label>
          <input type="text" required value={formData.brief_title} onChange={(e) => setFormData({ ...formData, brief_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea value={formData.brief_description} onChange={(e) => setFormData({ ...formData, brief_description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-briefs?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create Brief'}</button>
        </div>
      </form>
    </div>
  )
}
