/**
 * Practice Configuration Item Create Page
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticeConfigItem } from '../../services/sim/practiceConfigMSService'

export default function PracticeConfigItemCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    item_reference: `CI-${Date.now()}`,
    item_name: '',
    item_description: '',
    item_type: '',
    status: 'draft'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticeConfigItem(projectId, formData)
      if (result.success) {
        navigate(`/simulator/practice-config-items/${result.data.id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating config item:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-config-items?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Practice Configuration Item</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Item Name *</label>
          <input type="text" required value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea value={formData.item_description} onChange={(e) => setFormData({ ...formData, item_description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-config-items?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create Item'}</button>
        </div>
      </form>
    </div>
  )
}
