import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { useCommsApi } from './useCommsApi'
import SummaryCard from '../../components/comms/SummaryCard'
import { exportListToWord, exportListToPPT } from '../../utils/exportUtils'

export default function MeetingSummaryView() {
  const { meetingId } = useParams()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { meeting, isSim } = useCommsApi()
  const [summary, setSummary] = useState(null)
  const [meet, setMeet] = useState(null)

  useEffect(() => {
    ;(async () => {
      const client = isSim ? simDb : platformDb
      if (meetingId) {
        const { data: s } = await client.from('comm_meeting_summaries').select('*').eq('meeting_id', meetingId).maybeSingle()
        setSummary(s)
        const { data: mm } = await meeting.getMeeting(meetingId)
        setMeet(mm)
      } else {
        const { data: rows } = await client.from('comm_meeting_summaries').select('*').order('generated_at', { ascending: false }).limit(50)
        setSummary(rows?.[0] || null)
      }
    })()
  }, [meetingId, meeting, isSim])

  const exportWord = async () => {
    await exportListToWord(
      [
        { key: 'summary', label: 'Summary' },
        { key: 'decisions', label: 'Decisions' },
      ],
      [
        {
          summary: summary?.summary_text || '',
          decisions: JSON.stringify(summary?.key_decisions || []),
        },
      ],
      `MeetingSummary_${meetingId || 'export'}`
    )
  }

  const exportPpt = async () => {
    await exportListToPPT(
      [
        { key: 'summary', label: 'Summary' },
        { key: 'decisions', label: 'Decisions' },
      ],
      [
        {
          summary: summary?.summary_text || '',
          decisions: JSON.stringify(summary?.key_decisions || []),
        },
      ],
      `MeetingSummary_${meetingId || 'export'}`
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{meet?.title || 'Meeting summaries'}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportWord}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200"
          >
            Export Word
          </button>
          <button
            type="button"
            onClick={exportPpt}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200"
          >
            Export PPT
          </button>
        </div>
      </div>
      {summary ? (
        <SummaryCard
          summaryText={summary.summary_text}
          keyDecisions={summary.key_decisions}
          actionItems={summary.action_items}
          sentiment={summary.sentiment}
        />
      ) : (
        <p className="text-gray-500">No AI summary yet. End a call and run processing from the extraction flow.</p>
      )}
      <Link to={`${basePath}/meetings`} className="text-cyan-600 dark:text-cyan-400 text-sm">
        ← Meetings
      </Link>
    </div>
  )
}
