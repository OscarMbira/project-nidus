import React from 'react'

export default function SimNPCTeamView({ assignments = [], theme }) {
  if (!assignments.length) {
    return <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>No NPC assignments loaded.</p>
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {assignments.map((row, index) => (
        <div
          key={row.id || row.role_name}
          className={`rounded-lg p-3 border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-white'}`}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mb-2"
            style={{ background: row.npc_characters?.avatar_colour ? `var(--tw-gradient-from, #6366f1)` : '#6366f1' }}
          >
            {(row.npc_characters?.character_initials || row.role_name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="font-medium text-sm">{row.npc_characters?.character_name || row.role_name}</div>
          <div className={`text-xs capitalize ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{row.role_name?.replace(/_/g, ' ')}</div>
        </div>
      ))}
    </div>
  )
}
