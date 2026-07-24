import ITTOProcessGroupBadge from './ITTOProcessGroupBadge'
import ITTODetailView from './ITTODetailView'
import { useState } from 'react'

export default function ITTOCard({
  record,
  titleKey = 'name',
  footer,
  defaultExpanded = false,
}) {
  const [open, setOpen] = useState(defaultExpanded)
  const title = record?.[titleKey] || 'ITTO'

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 p-4 shadow-sm flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            <ITTOProcessGroupBadge processGroup={record?.process_group} />
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              {record?.knowledge_area || '—'}
            </span>
            {record?.status && (
              <span className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                {record.status}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline min-h-[44px] px-2"
        >
          {open ? 'Hide detail' : 'View detail'}
        </button>
      </div>
      {record?.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{record.description}</p>
      )}
      {open && <ITTODetailView record={record} />}
      {footer && <div className="pt-2 border-t border-gray-200 dark:border-gray-700">{footer}</div>}
    </div>
  )
}
