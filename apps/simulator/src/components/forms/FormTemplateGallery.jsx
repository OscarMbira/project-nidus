export default function FormTemplateGallery({ templates = [], onSelect, onEdit, canEdit = false, recommendedCode = null, recommendedTier = null }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <div
          key={template.id || template.template_code}
          className={`rounded-lg border bg-white dark:bg-gray-900 p-4 text-left ${
            recommendedCode && template.template_code === recommendedCode
              ? 'border-sky-500 ring-2 ring-sky-500'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          {recommendedCode && template.template_code === recommendedCode && (
            <p className="mb-2 inline-block rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 text-xs font-medium px-3 py-1">
              Inherited from: {recommendedTier === 'pmo' ? 'PMO default' : recommendedTier}
            </p>
          )}
          <button
            type="button"
            onClick={() => onSelect?.(template)}
            className="w-full text-left hover:opacity-90"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{template.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {template.template_code} • {template.process_group}
              {!template.is_active && (
                <span className="ml-2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5">
                  Draft
                </span>
              )}
            </p>
          </button>
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Edit template
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
