/**
 * Practice Task Detail Page
 * Task form with all fields, comments and attachments
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticeTaskById, createPracticeTask, updatePracticeTask } from '../../services/sim/practiceTaskService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PRACTICE_TASK_VIEW_SECTIONS = [
  { title: 'Task', fields: [
    { key: 'task_name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' }
  ]}
]

export default function PracticeTaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState(null)
  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    status: 'todo',
    priority: 'medium',
    planned_start_date: '',
    planned_end_date: '',
    due_date: '',
    estimated_hours: '',
    percentage_complete: 0
  })

  useEffect(() => {
    if (id && id !== 'create') {
      loadTask()
    }
  }, [id])

  const loadTask = async () => {
    try {
      setLoading(true)
      const result = await getPracticeTaskById(id)
      if (result.success) {
        setTask(result.data)
        setFormData(result.data)
      }
    } catch (error) {
      console.error('Error loading task:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      let result
      if (id === 'create') {
        result = await createPracticeTask({ ...formData, practice_project_id: projectId })
      } else {
        result = await updatePracticeTask(id, formData)
      }
      if (result.success) {
        navigate(`/simulator/practice-tasks?projectId=${projectId}`)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/simulator/practice-tasks?projectId=${projectId}`)}
        className="mb-4 inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tasks
      </button>

      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {id === 'create' ? 'Create Practice Task' : 'Edit Practice Task'}
        </h1>
        {(task || (id !== 'create' && formData.task_name)) && (
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportWord={() => exportRecordToWord(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportExcel={() => exportRecordToExcel(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportCSV={() => exportRecordToCSV(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportXML={() => exportRecordToXML(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportJSON={() => exportRecordToJSON(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
            onExportPrint={() => exportRecordToPrint(PRACTICE_TASK_VIEW_SECTIONS, task || formData, `PracticeTask_${task?.id || id}`)}
          />
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Name *</label>
          <input
            type="text"
            required
            value={formData.task_name}
            onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.task_description}
            onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={formData.planned_start_date}
              onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={formData.planned_end_date}
              onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/simulator/practice-tasks?projectId=${projectId}`)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Task'}
          </button>
        </div>
      </form>
    </div>
  )
}
