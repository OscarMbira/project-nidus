/**
 * Meeting Calendar — governance meetings for this project (taxonomy §3, Project Setup >
 * Governance > Meeting Calendar). Reuses the existing Comms Hub meetings feature
 * (comm_meetings / meetingService.js) rather than duplicating a scheduling system.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Calendar, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { listMeetingsForAccount } from '../../services/communications/meetingService'

const STATUS_COLORS = {
  scheduled:   'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  in_progress: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  ended:       'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  cancelled:   'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

export default function GovernanceMeetingCalendarPage() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const accountId = await getCurrentUserAccountId()
      const { data, error } = await listMeetingsForAccount(accountId, { projectId })
      if (error) throw error
      setMeetings(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Meeting Calendar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled meetings for this project</p>
          </div>
          <Link to={`/platform/comms/meetings/new?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Plus className="h-4 w-4" /> Schedule meeting
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : meetings.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No meetings scheduled for this project yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => (
              <Link key={m.id} to={`/platform/comms/meetings/${m.id}`}
                className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium flex items-center gap-1.5">
                      <Video className="h-4 w-4 text-gray-400" /> {m.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {m.scheduled_start ? new Date(m.scheduled_start).toLocaleString() : 'Not scheduled'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[m.status] || STATUS_COLORS.scheduled}`}>
                    {m.status?.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
