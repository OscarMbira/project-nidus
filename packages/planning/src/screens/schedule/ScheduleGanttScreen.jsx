/**
 * v1239 Slice 3 — Gantt view of the plan's tasks (shared by Platform, Simulator and Planner).
 * Replaces the activity-based Gantt pages; bars open the routed task page.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScheduleGanttChart from '../../components/ScheduleGanttChart.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleLinks, useScheduleProjectId } from '../../hooks/useSchedule.js'

const ZOOMS = [{ value: 'day', label: 'Days' }, { value: 'week', label: 'Weeks' }, { value: 'month', label: 'Months' }]

export default function ScheduleGanttScreen() {
  const navigate = useNavigate()
  const link = useScheduleLinks()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const [zoom, setZoom] = useState('week')
  const [showBaseline, setShowBaseline] = useState(false)

  return (
    <ScheduleLayout
      title="Gantt chart"
      description="Bars use the scheduled dates. Red bars are on the critical path."
      schedule={projectId ? schedule : null}
      actions={
        <button type="button" onClick={() => window.print()} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Print</button>
      }
    >
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3 text-sm">
            <div role="group" aria-label="Zoom" className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {ZOOMS.map((z) => (
                <button key={z.value} type="button" aria-pressed={zoom === z.value} onClick={() => setZoom(z.value)}
                  className={`px-3 py-1.5 ${zoom === z.value ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}>
                  {z.label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} /> Show baseline
            </label>
          </div>
          <ScheduleGanttChart
            tasks={schedule.tasks}
            dependencies={schedule.dependencies}
            zoom={zoom}
            showBaseline={showBaseline}
            onTaskClick={(t) => navigate(link(`tasks/${encodeURIComponent(t.task_code || t.id)}`))}
          />
        </div>
      )}
    </ScheduleLayout>
  )
}
