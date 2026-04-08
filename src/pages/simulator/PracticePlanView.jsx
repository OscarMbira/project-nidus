/**
 * Practice Plan View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getPracticePlanMilestones, getPracticePlanResources } from '../../services/sim/practicePlanService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'

export default function PracticePlanView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [milestones, setMilestones] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadMilestones()
      loadResources()
    }
  }, [id])

  const loadMilestones = async () => {
    try {
      const result = await getPracticePlanMilestones(id)
      if (result.success) setMilestones(result.data || [])
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const loadResources = async () => {
    try {
      const result = await getPracticePlanResources(id)
      if (result.success) setResources(result.data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading resources:', error)
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(`/simulator/practice-plans?projectId=${projectId}`)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Plan</h1>
        <ExportRecordButtons onExportPPT={() => {}} onExportWord={() => {}} onExportExcel={() => {}} disabled />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="font-medium mb-4">Milestones</h3>
          {milestones.length === 0 ? <p className="text-gray-500">No milestones defined</p> : (
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="text-gray-600 dark:text-gray-400">{m.milestone_name} - {m.milestone_date}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-medium mb-4">Resources</h3>
          {resources.length === 0 ? <p className="text-gray-500">No resources defined</p> : (
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="text-gray-600 dark:text-gray-400">{r.resource_name} - {r.resource_type}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
