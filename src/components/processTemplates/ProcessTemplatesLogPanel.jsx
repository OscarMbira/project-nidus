import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PROCESS_LOGS, resolvePath } from './processTemplatesRegistry'

export default function ProcessTemplatesLogPanel({ groupId, roleKey }) {
  const items = PROCESS_LOGS[groupId] || []

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        Logs
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No additional logs for this group.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const href = resolvePath(item, roleKey)
            return (
              <li key={item.label}>
                {href ? (
                  <Link
                    to={href}
                    className="block rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-gray-800/80"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="block px-3 py-2 text-sm text-gray-500">{item.label}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
