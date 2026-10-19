import React, { useState } from 'react'
import SimNPCMessageComposer from './SimNPCMessageComposer'
import { trustLabel } from '../../services/sim/simAiAgentsService'

const TRUST_STYLE = {
  low: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  high: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
}

/**
 * NPC stakeholders in a run. v1272 Phase 3 (D15): shows each stakeholder's trust in the learner
 * (from their run memory) and lets the learner message them in place.
 */
export default function SimNPCTeamView({ assignments = [], memory = {}, runId = null, onMessageSent }) {
  const [openId, setOpenId] = useState(null)
  if (!assignments.length) {
    return <p className="text-gray-600 dark:text-gray-400">No NPC assignments loaded.</p>
  }
  const open = assignments.find((a) => (a.id || a.role_name) === openId)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {assignments.map((row) => {
          const key = row.id || row.role_name
          const mem = memory[row.npc_character_id]
          const trust = trustLabel(mem?.trust_score)
          return (
            <div key={key} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/80">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 font-bold text-white">
                {(row.npc_characters?.character_initials || row.role_name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.npc_characters?.character_name || row.role_name}</div>
              <div className="text-xs capitalize text-gray-500 dark:text-gray-400">{row.role_name?.replace(/_/g, ' ')}</div>
              {mem && (
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TRUST_STYLE[trust.tone]}`} title={mem.summary || ''}>
                  {trust.label}
                </span>
              )}
              {runId && row.npc_character_id && (
                <button type="button" onClick={() => setOpenId(openId === key ? null : key)}
                  className="mt-2 block text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {openId === key ? 'Close' : 'Message'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {open && (
        <SimNPCMessageComposer
          runId={runId}
          npcCharacterId={open.npc_character_id}
          npcLabel={open.npc_characters?.character_name || open.role_name}
          onSent={onMessageSent}
        />
      )}
    </div>
  )
}
