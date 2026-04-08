export default function TestMetricsCards({ suiteStats, caseStats, runStats, defectStats }) {
  const cards = [
    { label: 'Suites', value: suiteStats?.total ?? '—', sub: 'Test suites' },
    { label: 'Cases', value: caseStats?.total ?? '—', sub: 'Active test cases' },
    { label: 'Runs', value: runStats?.length ?? '—', sub: 'Recent runs loaded' },
    { label: 'Defects', value: defectStats?.total ?? '—', sub: 'Open issues' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
          <p className="text-[11px] text-gray-500 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
