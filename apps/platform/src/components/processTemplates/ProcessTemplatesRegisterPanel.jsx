import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { PROCESS_REGISTERS, resolvePath } from './processTemplatesRegistry'

export default function ProcessTemplatesRegisterPanel({ groupId, roleKey }) {
  const items = PROCESS_REGISTERS[groupId] || []

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4" />
        Registers
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No registers linked for this group.</p>
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
