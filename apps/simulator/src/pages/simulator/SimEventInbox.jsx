import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EventModal from '../../components/sim/EventModal'
import { getPendingEvents, scoreEventResponse } from '../../services/sim/simNPCEngineService'
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

  const load = async () => {
    const pe = await getPendingEvents(runId)
    const { data: past } = await simDb.from('ai_events').select('*').eq('run_id', runId).eq('is_resolved', true).limit(40)
    setList(pe.data || [])
    setResolved(past || [])
    const ids = [...new Set((pe.data || []).map((e) => e.npc_character_id).filter(Boolean))]
    if (ids.length) {
      const { data: chars } = await simDb.from('npc_characters').select('*').in('id', ids)
      setNpcLookup(Object.fromEntries((chars || []).map((c) => [c.id, c])))
    }
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
            className={`rounded px-3 py-1 text-sm capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {rows.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => filter === 'pending' && setActive(mapEvent(ev, npcLookup))}
              className={`w-full text-left rounded-lg border px-4 py-3 dark:border-gray-700 ${ev.severity === 'critical' ? 'border-red-500 ring-1 ring-red-500/40' : ''}`}
            >
              <div className="font-medium">{ev.event_name}</div>
              <div className="text-xs text-gray-500 capitalize">{ev.severity} · {ev.event_category}</div>
            </button>
          </li>
        ))}
      </ul>
      {active && (
        <EventModal
          event={active}
          onClose={() => setActive(null)}
          onResponse={async (payload) => {
            const idx = payload?.selectedOptionIndex ?? 0
            await scoreEventResponse(active.id, idx)
            setActive(null)
            load()
          }}
        />
      )}
    </div>
  )
}
