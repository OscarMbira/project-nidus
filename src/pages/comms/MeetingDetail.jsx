import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { useCommsApi } from './useCommsApi'
import TranscriptViewer from '../../components/comms/TranscriptViewer'

export default function MeetingDetail() {
  const { meetingId } = useParams()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting, isSim } = useCommsApi()
  const [m, setM] = useState(null)
  const [segments, setSegments] = useState([])

  useEffect(() => {
    ;(async () => {
      const { data } = await meeting.getMeeting(meetingId)
      setM(data)
      const client = isSim ? simDb : platformDb
      const { data: tr } = await client.from('comm_meeting_transcripts').select('*').eq('meeting_id', meetingId).order('segment_index')
      setSegments(tr || [])
    })()
  }, [meeting, meetingId, isSim])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{m?.title || 'Meeting'}</h1>
          <p className="text-sm text-gray-500">{m?.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${basePath}/meetings/${meetingId}/room`}
            className="inline-flex px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm min-h-[44px] items-center"
          >
            Join room
          </Link>
          <Link
            to={`${basePath}/meetings/${meetingId}/summary`}
            className="inline-flex px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm min-h-[44px] items-center text-gray-800 dark:text-gray-200"
          >
            Summary
          </Link>
        </div>
      </div>
      <section>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Transcript</h2>
        <TranscriptViewer segments={segments} />
      </section>
    </div>
  )
}
