import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planConfidenceService'
import * as simApi from '../../../services/sim/simPlanConfidenceService'
import { platformDb } from '../../../services/supabase/supabaseClient'

export default function ConfidenceForecastView() {
  const isSim = useLocation().pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      try {
        const data = isSim ? await simApi.getConfidenceForecasts(projectId) : await api.getConfidenceForecasts(projectId)
        setRows(data || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load forecasts')
      }
    })()
  }, [projectId, isSim])

  const addRow = async () => {
    if (!projectId) return
    try {
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (isSim) {
        await simApi.setConfidence({
          practice_project_id: projectId,
          confidence_pct: 70,
          likely_date: new Date().toISOString().slice(0, 10),
          created_by: user?.id ?? null,
        })
      } else {
        await api.setConfidence({
          project_id: projectId,
          confidence_pct: 70,
          likely_date: new Date().toISOString().slice(0, 10),
          created_by: null,
        })
      }
      const data = isSim ? await simApi.getConfidenceForecasts(projectId) : await api.getConfidenceForecasts(projectId)
      setRows(data || [])
      toast.success('Forecast added')
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Confidence forecast</h1>
        <PlanningProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <>
            <button type="button" onClick={addRow} className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2">
              Add sample forecast
            </button>
            <table className="mt-4 w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left p-2">Confidence %</th>
                  <th className="text-left p-2">Likely date</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="p-2">{r.confidence_pct}</td>
                    <td className="p-2">{r.likely_date || '—'}</td>
                    <td className="p-2">{r.basis_notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
