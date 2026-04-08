/**
 * Practice Highlight Report Create Page
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticeHighlightReport } from '../../services/sim/practiceHighlightReportService'

export default function PracticeHighlightReportCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    report_title: '',
    report_date: new Date().toISOString().split('T')[0],
    executive_summary: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await createPracticeHighlightReport(projectId, { ...formData, report_reference: `HR-${Date.now()}` })
      if (result.success) {
        navigate(`/simulator/practice-highlight-reports/${result.data.id}?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-highlight-reports?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create Practice Highlight Report</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Report Title *</label>
          <input type="text" required value={formData.report_title} onChange={(e) => setFormData({ ...formData, report_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Report Date *</label>
          <input type="date" required value={formData.report_date} onChange={(e) => setFormData({ ...formData, report_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Executive Summary</label>
          <textarea value={formData.executive_summary} onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-highlight-reports?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Creating...' : 'Create Report'}</button>
        </div>
      </form>
    </div>
  )
}
