import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, ExternalLink } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function LinkToRiskWidget({ lesson, projectId, onRiskLinked }) {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRiskId, setSelectedRiskId] = useState(lesson?.linked_risk_id || null)

  useEffect(() => {
    if (projectId) {
      loadRisks()
    }
  }, [projectId])

  const loadRisks = async () => {
    try {
      setLoading(true)
      // Get risk register for project
      const { data: riskRegister } = await supabase
        .from('risk_registers')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (riskRegister) {
        const { data: risksData } = await supabase
          .from('risks')
          .select('id, risk_reference, risk_title, risk_description')
          .eq('risk_register_id', riskRegister.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })

        setRisks(risksData || [])
      }
    } catch (error) {
      console.error('Error loading risks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLinkRisk = async () => {
    if (!selectedRiskId) return

    try {
      const { updateLesson } = await import('../../services/lessonService')
      await updateLesson(lesson.id, { linked_risk_id: selectedRiskId })
      
      if (onRiskLinked) {
        onRiskLinked(selectedRiskId)
      }
      
      alert('Lesson linked to risk successfully')
    } catch (error) {
      console.error('Error linking risk:', error)
      alert('Error linking risk: ' + error.message)
    }
  }

  if (!lesson) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        <h4 className="font-semibold text-gray-900 dark:text-white">Link to Risk</h4>
      </div>

      {lesson.linked_risk_id ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This lesson is linked to a risk in the Risk Register.
          </p>
          <button
            onClick={() => window.open(`/app/projects/${projectId}/risks/${lesson.linked_risk_id}`, '_blank')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View Linked Risk
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Risk to Link
            </label>
            <select
              value={selectedRiskId || ''}
              onChange={(e) => setSelectedRiskId(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={loading}
            >
              <option value="">Select a risk...</option>
              {risks.map(risk => (
                <option key={risk.id} value={risk.id}>
                  {risk.risk_reference}: {risk.risk_title}
                </option>
              ))}
            </select>
          </div>
          {selectedRiskId && (
            <button
              onClick={handleLinkRisk}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Link to Risk
            </button>
          )}
        </div>
      )}
    </div>
  )
}
