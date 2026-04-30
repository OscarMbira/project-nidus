export default function DraftFormQueue({ drafts = [], onResume }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-100">Draft Queue</h3>
      <ul className="space-y-2">
        {drafts.map((d) => (
          <li key={d.id} className="flex items-center justify-between text-xs text-gray-300">
            <span>{d.title || d.id}</span>
            <button type="button" onClick={() => onResume?.(d)} className="rounded bg-blue-600 px-2 py-1 text-white">Resume</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
