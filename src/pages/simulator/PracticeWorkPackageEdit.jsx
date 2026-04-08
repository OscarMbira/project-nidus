/**
 * Practice Work Package Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeWorkPackageById, updatePracticeWorkPackage } from '../../services/sim/practiceWorkPackageService'

export default function PracticeWorkPackageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    work_package_name: '',
    work_package_description: '',
    objectives: '',
    quality_criteria: '',
    acceptance_criteria: ''
  })

  useEffect(() => {
    if (id) loadWorkPackage()
  }, [id])

  const loadWorkPackage = async () => {
    try {
      setLoading(true)
      const result = await getPracticeWorkPackageById(id)
      if (result.success) setFormData(result.data)
    } catch (error) {
      console.error('Error loading work package:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticeWorkPackage(id, formData)
      if (result.success) {
        navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error updating work package:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Practice Work Package</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Work Package Name *</label>
          <input type="text" required value={formData.work_package_name} onChange={(e) => setFormData({ ...formData, work_package_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea value={formData.work_package_description} onChange={(e) => setFormData({ ...formData, work_package_description: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-work-packages/${id}?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  )
}
