import React from 'react'

function Gauge({ label, value, theme }) {
  const v = typeof value === 'number' ? value : 0
  const color = v >= 75 ? 'bg-green-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className={`flex justify-between text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        <span>{label}</span>
        <span>{Math.round(v)}</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
      </div>
    </div>
  )
}

export default function SimHealthGauges({ health = {}, theme }) {
  const h = { budget_pct: 100, schedule_variance_days: 0, quality_score: 100, team_morale: 100, stakeholder_satisfaction: 100, ...health }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Gauge label="Budget %" value={h.budget_pct} theme={theme} />
      <Gauge label="Quality score" value={h.quality_score} theme={theme} />
      <Gauge label="Team morale" value={h.team_morale} theme={theme} />
      <Gauge label="Stakeholder satisfaction" value={h.stakeholder_satisfaction} theme={theme} />
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        <span className="font-medium">Schedule variance</span>
        <div className="text-lg font-semibold mt-1">{h.schedule_variance_days ?? 0} days</div>
      </div>
    </div>
  )
}
