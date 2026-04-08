import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function DefectBySeverityChart({ bySeverity }) {
  const data = Object.entries(bySeverity || {}).map(([severity, count]) => ({
    severity,
    count,
  }))
  if (data.length === 0) {
    return <p className="text-xs text-gray-500 py-8 text-center">No defects by severity.</p>
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="severity" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
