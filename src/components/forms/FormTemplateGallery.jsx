export default function FormTemplateGallery({ templates = [], onSelect, userRole }) {
  const filtered = userRole
    ? templates.filter((template) => {
        if (!Array.isArray(template.allowed_roles) || template.allowed_roles.length === 0) return true
        return template.allowed_roles.includes(userRole)
      })
    : templates

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((template) => (
        <button
          type="button"
          key={template.id || template.template_code}
          onClick={() => onSelect?.(template)}
          className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-left hover:border-blue-500"
        >
          <p className="text-sm font-semibold text-gray-100">{template.name}</p>
          <p className="text-xs text-gray-400">{template.template_code} • {template.process_group}</p>
        </button>
      ))}
    </div>
  )
}
