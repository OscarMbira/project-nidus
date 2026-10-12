import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlanningProjectId } from '../../../hooks/usePlanningProjectId.js'
import * as api from '../../../services/platform/planConfidenceService'
import * as simApi from '../../../services/sim/simPlanConfidenceService'
import { platformDb } from '@nidus/supabase'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'

export default function ConfidenceForecastView() {
  const navigate = useNavigate()
  const isSim = usePlanning().isSim
  const ProjectBar = usePlanning().ProjectBar
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
    <div className="text-gray-900 dark:text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Confidence forecast</h1>
        <ProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <>
            <button type="button" onClick={addRow} className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2">
              Add sample forecast
            </button>
            <table className="mt-4 w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="text-left p-2">Confidence %</th>
                  <th className="text-left p-2">Likely date</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-800">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
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
