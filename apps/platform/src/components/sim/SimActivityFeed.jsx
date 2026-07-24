import React from 'react'

export default function SimActivityFeed({ items = [], theme }) {
  if (!items.length) return <p className="text-sm text-gray-500">No activity yet.</p>
  return (
    <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
      {items.map((it, i) => (
        <li key={i} className={`rounded border px-3 py-2 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
          <span className="text-xs text-gray-500">{it.at}</span>
          <div>{it.text}</div>
        </li>
      ))}
    </ul>
  )
}
