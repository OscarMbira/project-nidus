import { CalendarDays } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listGapRecords } from '../services/gapDataService'
import { platformDb } from '../../../services/supabase/supabaseClient'

export default function UniversalCalendarPage({ sim = false }) {
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('month')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const overrides = await listGapRecords('calendar_event_overrides', { sim })
        setEvents(overrides)
        if (!sim) {
          const { data, error: taskErr } = await platformDb
            .from('tasks')
            .select('id, task_name, due_date, task_status')
            .eq('is_deleted', false)
            .not('due_date', 'is', null)
            .order('due_date')
            .limit(100)
          if (taskErr) throw taskErr
          setTasks(data || [])
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sim])

  const allItems = useMemo(() => {
    const fromTasks = tasks.map((t) => ({
      id: t.id,
      title: t.task_name,
      date: t.due_date?.slice?.(0, 10) || t.due_date,
      type: 'task',
      status: t.task_status,
    }))
    const fromOverrides = events.map((e) => ({
      id: e.id,
      title: e.event_title || e.title,
      date: e.event_date?.slice?.(0, 10) || e.event_date,
      type: 'event',
      status: e.event_status,
    }))
    return [...fromTasks, ...fromOverrides].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [tasks, events])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Calendar</h1>
            <p className="text-gray-400">Tasks, milestones, meetings, and calendar events in one view.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-2 rounded-lg text-sm capitalize ${
                view === v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="mb-4 p-3 rounded-lg bg-red-900/30 text-red-200">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {allItems.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No calendar items with dates found.</p>
          ) : (
            allItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-800 border border-gray-700"
              >
                <span className="text-sm font-mono text-blue-400 w-28 shrink-0">{item.date || '—'}</span>
                <span className="text-xs uppercase px-2 py-0.5 rounded bg-gray-700 text-gray-300">{item.type}</span>
                <span className="text-gray-100 flex-1 truncate">{item.title}</span>
                {item.status && <span className="text-xs text-gray-500">{item.status}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
