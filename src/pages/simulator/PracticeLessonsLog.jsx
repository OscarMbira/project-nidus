/**
 * Practice Lessons Log Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Plus } from 'lucide-react'
import { getPracticeLessonsLog, getPracticeLessonEntries, createPracticeLessonsLog, createPracticeLessonEntry } from '../../services/sim/practiceLessonsService'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PRACTICE_LESSON_ENTRY_COLUMNS = [
  { key: 'lesson_title', label: 'Title' },
  { key: 'lesson_description', label: 'Description' },
  { key: 'status', label: 'Status' }
]

export default function PracticeLessonsLog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [log, setLog] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadLog()
    }
  }, [projectId])

  const loadLog = async () => {
    try {
      setLoading(true)
      const result = await getPracticeLessonsLog(projectId)
      if (result.success) {
        setLog(result.data)
        if (result.data) {
          const entriesResult = await getPracticeLessonEntries(result.data.id)
          if (entriesResult.success) setEntries(entriesResult.data || [])
        }
      } else {
        const createResult = await createPracticeLessonsLog(projectId, { log_reference: `LL-${Date.now()}` })
        if (createResult.success) {
          setLog(createResult.data)
        }
      }
    } catch (error) {
      console.error('Error loading lessons log:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Lessons Log</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_LESSON_ENTRY_COLUMNS} data={entries} baseFilename="PracticeLessonsLog" disabled={!entries.length} />
          {log && (
          <button onClick={() => navigate(`/simulator/practice-lessons-log/${log.id}/entry?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Add Lesson
          </button>
          )}
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : !log ? <div className="text-center py-12 text-gray-500">Creating lessons log...</div> : entries.length === 0 ? <div className="text-center py-12 text-gray-500">No lessons logged yet. Add your first lesson.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Lesson</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} onClick={() => navigate(`/simulator/practice-lessons-log/${log.id}/entry/${entry.id}?projectId=${projectId}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.lesson_title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{entry.lesson_description?.substring(0, 60)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.effect_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.priority}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
