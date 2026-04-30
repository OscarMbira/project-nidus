export default function FormSectionCard({ title, children }) {
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-100">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
