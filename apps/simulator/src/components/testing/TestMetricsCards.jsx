import { Link } from 'react-router-dom'

const cardClass = 'block rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-600'

export default function TestMetricsCards({ suiteStats, caseStats, runStats, defectStats }) {
  const cards = [
    { label: 'Suites', value: suiteStats?.total ?? '—', hint: 'Test suites', to: '/platform/testing/suites' },
    { label: 'Cases', value: caseStats?.total ?? '—', hint: 'Active test cases', to: '/platform/testing/cases' },
    { label: 'Runs', value: runStats?.length ?? '—', hint: 'Recent runs loaded', to: '/platform/testing/runs' },
    { label: 'Defects', value: defectStats?.total ?? '—', hint: 'Open issues', to: '/platform/testing/defects' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Link key={card.label} to={card.to} className={cardClass}>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{card.hint}</p>
        </Link>
      ))}
    </div>
  )
}
