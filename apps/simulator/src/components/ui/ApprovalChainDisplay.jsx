import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react'

const STATUS_ICON = {
  waiting: Circle,
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  withdrawn: Circle,
}

const STATUS_COLOR = {
  waiting: 'text-gray-400',
  pending: 'text-amber-500',
  approved: 'text-green-500',
  rejected: 'text-red-500',
  withdrawn: 'text-gray-400',
}

export default function ApprovalChainDisplay({ progress, chain = [], className = '' }) {
  const levels = progress?.levels || chain || []
  const nextApprover = progress?.nextApproverName
  const currentLevel = progress?.currentLevel

  if (!levels?.length && !chain?.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No approval chain configured.</p>
  }

  const renderLevels = Array.isArray(levels) && levels[0]?.authorisers
    ? levels
    : chain.reduce((acc, item) => {
        const existing = acc.find((l) => l.level === item.level)
        const authoriser = { name: item.fullName || item.name, status: item.status || 'waiting' }
        if (existing) existing.authorisers.push(authoriser)
        else acc.push({ level: item.level, label: item.roleLabel, authorisers: [authoriser] })
        return acc
      }, [])

  return (
    <div className={`space-y-3 ${className}`}>
      {nextApprover && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm text-blue-800 dark:text-blue-200">
          Next approver: <strong>{nextApprover}</strong>
        </div>
      )}
      {renderLevels.map((lvl) => {
        const isCurrent = lvl.level === currentLevel
        return (
          <div
            key={lvl.level}
            className={`rounded-lg border p-3 ${
              isCurrent
                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="text-xs font-semibold uppercase text-gray-500 mb-2">
              Level {lvl.level}{lvl.label ? ` — ${lvl.label}` : ''}
            </div>
            <ul className="space-y-1">
              {(lvl.authorisers || []).map((a, i) => {
                const Icon = STATUS_ICON[a.status] || Circle
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${STATUS_COLOR[a.status] || 'text-gray-400'}`} />
                    <span className="text-gray-900 dark:text-gray-100">{a.name}</span>
                    <span className="text-gray-500 capitalize">{a.status}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
