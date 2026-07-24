import React from 'react'

const PHASES = ['initiation', 'planning', 'execution', 'closure']

export default function SimPhaseProgressBar({ activeStage = 'initiation', theme }) {
  const idx = Math.max(0, PHASES.indexOf(activeStage))
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <span
            className={`px-2 py-1 rounded text-xs font-medium capitalize ${
              i <= idx
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-200 text-gray-600'
            }`}
          >
            {p}
          </span>
          {i < PHASES.length - 1 && <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>→</span>}
        </React.Fragment>
      ))}
    </div>
  )
}
