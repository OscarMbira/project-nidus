function Section({ title, items, itemRender }) {
  if (!items?.length) return null
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h4>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {items.map((it, idx) => (
          <li key={it.id || idx}>{itemRender(it)}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ITTODetailView({ record }) {
  if (!record) return null

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-4 text-sm">
      <Section
        title="Inputs"
        items={record.inputs || []}
        itemRender={(it) => (
          <span>
            <strong className="text-gray-900 dark:text-white">{it.name}</strong>
            {it.description ? ` — ${it.description}` : ''}
            {it.source ? <span className="text-gray-500 dark:text-gray-400"> ({it.source})</span> : null}
          </span>
        )}
      />
      <Section
        title="Tools & techniques"
        items={record.tools_techniques || []}
        itemRender={(it) => (
          <span>
            <strong className="text-gray-900 dark:text-white">{it.name}</strong>
            {it.type ? ` [${it.type}]` : ''}
            {it.description ? ` — ${it.description}` : ''}
          </span>
        )}
      />
      <Section
        title="Outputs"
        items={record.outputs || []}
        itemRender={(it) => (
          <span>
            <strong className="text-gray-900 dark:text-white">{it.name}</strong>
            {it.description ? ` — ${it.description}` : ''}
            {it.destination ? (
              <span className="text-gray-500 dark:text-gray-400"> → {it.destination}</span>
            ) : null}
          </span>
        )}
      />
      {record.tailoring_notes && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Tailoring notes</h4>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{record.tailoring_notes}</p>
        </div>
      )}
    </div>
  )
}
