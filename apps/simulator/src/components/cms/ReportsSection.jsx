/**
 * Reports Section Component
 * Communication reports list management
 */

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { getReports, addReport, updateReport, deleteReport } from '../../services/cmsReportsService'
import ReportCard from './ReportCard'
import ReportForm from './ReportForm'

export default function ReportsSection({ cmsId, readOnly = false }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    report_name: '',
    report_type: '',
    report_description: '',
    report_purpose: '',
    frequency: '',
    target_audience: '',
    distribution_method: '',
    content_outline: ''
  })

  useEffect(() => {
    if (cmsId) {
      loadReports()
    }
  }, [cmsId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await getReports(cmsId)
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await updateReport(editingId, formData)
      } else {
        await addReport(cmsId, formData)
      }
      await loadReports()
      setShowForm(false)
      setEditingId(null)
      resetForm()
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Error saving report: ' + error.message)
    }
  }

  const handleEdit = (report) => {
    setFormData({
      report_name: report.report_name || '',
      report_type: report.report_type || '',
      report_description: report.report_description || '',
      report_purpose: report.report_purpose || '',
      frequency: report.frequency || '',
      target_audience: report.target_audience || '',
      distribution_method: report.distribution_method || '',
      content_outline: report.content_outline || ''
    })
    setEditingId(report.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return
    try {
      await deleteReport(id)
      await loadReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Error deleting report: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      report_name: '',
      report_type: '',
      report_description: '',
      report_purpose: '',
      frequency: '',
      target_audience: '',
      distribution_method: '',
      content_outline: ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  if (!cmsId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the CMS first before adding reports
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Communication Reports
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define the communication reports to be produced (status reports, progress reports, etc.)
          </p>
        </div>
        {!readOnly && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Report
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && !readOnly && (
        <ReportForm
          reportData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={!!editingId}
        />
      )}

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No communication reports defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onEdit={handleEdit}
              onDelete={handleDelete}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}
