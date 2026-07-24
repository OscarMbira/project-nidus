/**
 * Practice Lesson Detail Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { updatePracticeLessonEntry } from '../../services/sim/practiceLessonsService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_LESSON_VIEW_SECTIONS = [
  { title: 'Lesson', fields: [
    { key: 'lesson_title', label: 'Title' },
    { key: 'lesson_description', label: 'Description' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PracticeLessonDetail() {
  const { logId, entryId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    lesson_title: '',
    lesson_description: '',
    effect_type: 'neutral',
    priority: 'medium',
    status: 'logged'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await updatePracticeLessonEntry(entryId, formData)
      if (result.success) {
        navigate(`/simulator/practice-lessons-log?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving lesson:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-lessons-log?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lesson Entry</h1>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportWord={() => exportRecordToWord(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportExcel={() => exportRecordToExcel(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportCSV={() => exportRecordToCSV(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportXML={() => exportRecordToXML(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportJSON={() => exportRecordToJSON(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
          onExportPrint={() => exportRecordToPrint(PRACTICE_LESSON_VIEW_SECTIONS, formData, `PracticeLesson_${entryId || 'new'}`)}
        />
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Lesson Title *</label>
          <input type="text" required value={formData.lesson_title} onChange={(e) => setFormData({ ...formData, lesson_title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea required value={formData.lesson_description} onChange={(e) => setFormData({ ...formData, lesson_description: e.target.value })} rows={6} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700" />
        </div>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate(`/simulator/practice-lessons-log?projectId=${projectId}`)} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Saving...' : 'Save Lesson'}</button>
        </div>
      </form>
    </div>
  )
}
