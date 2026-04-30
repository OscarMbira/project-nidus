export default function SimpleFormWidget({ title, items = [] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-100">{title}</h3>
      <ul className="space-y-1 text-xs text-gray-300">
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </div>
  )
}
