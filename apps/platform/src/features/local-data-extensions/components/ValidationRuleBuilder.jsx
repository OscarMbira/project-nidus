export default function ValidationRuleBuilder({ rules = {}, onChange }) {
  const r = rules || {}
  const set = (patch) => onChange?.({ ...r, ...patch })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!r.required} onChange={(e) => set({ required: e.target.checked })} />
        Required
      </label>
      <input
        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
        placeholder="Required message"
        value={r.requiredMessage || ''}
        onChange={(e) => set({ requiredMessage: e.target.value })}
      />
      <label className="md:col-span-2">
        Max length
        <input
          type="number"
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
          value={r.maxLength ?? ''}
          onChange={(e) => set({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
        />
      </label>
      <label className="md:col-span-2">
        Min / Max (numbers)
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
            placeholder="Min"
            value={r.min ?? ''}
            onChange={(e) => set({ min: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
          <input
            type="number"
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
            placeholder="Max"
            value={r.max ?? ''}
            onChange={(e) => set({ max: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </div>
      </label>
      <label className="md:col-span-2">
        Regex pattern
        <input
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1 font-mono text-xs"
          value={r.pattern || ''}
          onChange={(e) => set({ pattern: e.target.value || undefined })}
        />
      </label>
      <label className="md:col-span-2">
        Pattern message
        <input
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
          value={r.patternMessage || ''}
          onChange={(e) => set({ patternMessage: e.target.value })}
        />
      </label>
    </div>
  )
}
