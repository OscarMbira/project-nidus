import { useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CreateRiskFromLessonWidget({ lesson, projectId }) {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const handleCreateRisk = () => {
    // Navigate to risk creation with pre-filled data from lesson
    const riskData = {
      risk_title: `Risk: ${lesson.lesson_title || lesson.title}`,
      risk_description: lesson.recommendations || lesson.what_happened || '',
      source_lesson_id: lesson.id,
      project_id: projectId
    }

    // Store in sessionStorage to pre-fill form
    sessionStorage.setItem('prefill_risk_data', JSON.stringify(riskData))
    navigate(`/app/projects/${projectId}/risks/create`)
  }

  if (!lesson || !projectId) return null

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Create Risk from Lesson Recommendation
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
            If this lesson's recommendation identifies a potential future risk, you can create a new risk in the Risk Register.
          </p>
          <button
            onClick={handleCreateRisk}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Create Risk from Recommendation
          </button>
        </div>
      </div>
    </div>
  )
}
