import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EventModal from '../../components/sim/EventModal'
import AiAssessmentCard from '../../components/sim/AiAssessmentCard'
import { getPendingEvents, scoreEventResponse } from '../../services/sim/simNPCEngineService'
import { assessDecision, listAssessments, listMyFlags, recordEventOutcome } from '../../services/sim/simAiAgentsService'
import { simDb } from '../../services/supabase/supabaseClient'

function mapEvent(ev, npcLookup) {
  const npcRow = ev.npc_character_id ? npcLookup[ev.npc_character_id] : null
  return {
    id: ev.id,
    title: ev.event_name || 'Event',
    category: ev.event_category || 'stakeholder',
    severity: ev.severity || 'medium',
    description: ev.event_description || '',
    options: Array.isArray(ev.response_options) ? ev.response_options : [],
    npc: npcRow
      ? { name: npcRow.character_name, role: npcRow.role_name?.replace(/_/g, ' ') }
      : null,
  }
}

export default function SimEventInbox() {
  const { runId } = useParams()
  const [list, setList] = useState([])
  const [resolved, setResolved] = useState([])
  const [filter, setFilter] = useState('pending')
  const [active, setActive] = useState(null)
  const [npcLookup, setNpcLookup] = useState({})
  const [assessments, setAssessments] = useState({}) // v1272 Phase 3: AI Assessor feedback by event
  const [flagged, setFlagged] = useState(new Set())
  const [reviewing, setReviewing] = useState(false)

  const load = async () => {
    const pe = await getPendingEvents(runId)
    const { data: past } = await simDb.from('ai_events').select('*').eq('run_id', runId).eq('is_resolved', true)
      .order('resolved_at', { ascending: false }).limit(40)
    setList(pe.data || [])
    setResolved(past || [])
    const ids = [...new Set([...(pe.data || []), ...(past || [])].map((e) => e.npc_character_id).filter(Boolean))]
    const [chars, assess, flags] = await Promise.all([
      ids.length ? simDb.from('npc_characters').select('*').in('id', ids).then((r) => r.data || []) : [],
      listAssessments(runId).catch(() => []),
      listMyFlags(runId).catch(() => []),
    ])
    setNpcLookup(Object.fromEntries(chars.map((c) => [c.id, c])))
    setAssessments(Object.fromEntries(assess.filter((a) => a.ai_event_id).map((a) => [a.ai_event_id, a])))
    setFlagged(new Set(flags.map((f) => f.assessment_id)))
  }

  useEffect(() => {
    if (runId) load()
  }, [runId])

  const rows = filter === 'pending' ? list : resolved

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Event inbox</h1>
      <div className="flex gap-2 mb-4">
        {['pending', 'resolved'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 text-sm capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
          >
            {f}
          </button>
        ))}
      </div>
      {reviewing && <p className="mb-3 text-sm text-indigo-700 dark:text-indigo-300">The AI Assessor is reviewing your decision…</p>}
      <ul className="space-y-2">
        {rows.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => filter === 'pending' && setActive(mapEvent(ev, npcLookup))}
              className={`w-full text-left rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700 ${ev.severity === 'critical' ? 'border-red-500 ring-1 ring-red-500/40' : ''}`}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">{ev.event_name}</div>
              <div className="text-xs text-gray-500 capitalize">{ev.severity} · {ev.event_category}</div>
            </button>
            {filter === 'resolved' && assessments[ev.id] && (
              <AiAssessmentCard assessment={assessments[ev.id]} flagged={flagged.has(assessments[ev.id].id)} />
            )}
          </li>
        ))}
      </ul>
      {active && (
        <EventModal
          event={active}
          onClose={() => setActive(null)}
          onResponse={async (payload) => {
            const idx = payload?.selectedOptionIndex ?? 0
            const eventId = active.id
            await scoreEventResponse(eventId, idx)
            setActive(null)
            await recordEventOutcome(runId, eventId)
            load()
            // AI Assessor (advisory unless the scenario counts it); skipped when the scenario has no rubric.
            setReviewing(true)
            assessDecision(runId, eventId).finally(() => { setReviewing(false); load() })
          }}
        />
      )}
    </div>
  )
}
