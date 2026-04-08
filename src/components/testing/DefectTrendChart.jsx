import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function DefectTrendChart({ trend }) {
  const data = Object.entries(trend || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
  if (data.length === 0) {
    return <p className="text-xs text-gray-500 py-8 text-center">Not enough data for trend.</p>
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
          <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={false} name="Opened" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
