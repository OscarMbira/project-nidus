/**
 * Practice Daily Log Entry Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createPracticeDailyLogEntry, updatePracticeDailyLogEntry } from '../../services/sim/practiceDailyLogService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_DAILY_LOG_ENTRY_SECTIONS = [
  { title: 'Daily Log Entry', fields: [
    { key: 'entry_date', label: 'Date' },
    { key: 'entry_type', label: 'Type' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PracticeDailyLogEntry() {
  const { logId, entryId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'comment',
    description: '',
    status: 'open'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (entryId === 'new') {
        result = await createPracticeDailyLogEntry(logId, formData)
      } else {
        result = await updatePracticeDailyLogEntry(entryId, formData)
      }
      if (result.success) {
        navigate(`/simulator/practice-daily-log?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving entry:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(`/simulator/practice-daily-log?projectId=${projectId}`)} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
<ExportRecordButtons
        onExportPPT={() => exportRecordToPPT(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportWord={() => exportRecordToWord(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportExcel={() => exportRecordToExcel(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportCSV={() => exportRecordToCSV(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportXML={() => exportRecordToXML(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportJSON={() => exportRecordToJSON(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        onExportPrint={() => exportRecordToPrint(PRACTICE_DAILY_LOG_ENTRY_SECTIONS, formData, `PracticeDailyLogEntry_${entryId || 'new'}`)}
        />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Daily Log Entry</h1>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Entry Date *</label>
          <input type="date" required value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Entry Type *</label>
          <select required value={formData.entry_type} onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700">
            <option value="problem">Problem</option>
            <option value="action">Action</option>
            <option value="event">Event</option>
            <option value="comment">Comment</option>
            <option value="observation">Observation</option>
            <option value="decision">Decision</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-daily-log?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save Entry'}</button>
        </div>
      </form>
    </div>
  )
}
