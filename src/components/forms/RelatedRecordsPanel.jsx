export default function RelatedRecordsPanel({ links = [] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-100">Related Records</h3>
      <ul className="space-y-1 text-xs text-gray-300">
        {links.map((link) => (
          <li key={link.id || `${link.source_id}-${link.target_id}`}>
            {link.source_type}:{link.source_id} -> {link.relationship_type} -> {link.target_type}:{link.target_id}
          </li>
        ))}
      </ul>
    </div>
  )
}
