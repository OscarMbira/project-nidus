import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useChartInk } from './useChartInk'

export default function DefectTrendChart({ trend }) {
  const ink = useChartInk()
  const data = Object.entries(trend || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
  if (data.length === 0) {
    return <p className="text-xs text-gray-700 dark:text-gray-200 py-8 text-center">Not enough data for trend.</p>
  }
  const tick = { fill: ink.tick, fontSize: 11 }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ink.grid} />
          <XAxis dataKey="date" stroke={ink.tick} tick={tick} tickLine={{ stroke: ink.tick }} axisLine={{ stroke: ink.tick }} />
          <YAxis stroke={ink.tick} tick={tick} tickLine={{ stroke: ink.tick }} axisLine={{ stroke: ink.tick }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: ink.tooltipBg, border: `1px solid ${ink.tooltipBorder}`, color: ink.tooltipText }}
            labelStyle={{ color: ink.tooltipText }}
            itemStyle={{ color: ink.tooltipText }}
          />
          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Opened" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
