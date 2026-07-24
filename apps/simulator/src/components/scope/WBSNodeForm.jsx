import { useState, useEffect } from 'react'

export default function WBSNodeForm({ initial, parentId, onSubmit, onCancel }) {
  const [wbs_code, setWbsCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level_num, setLevelNum] = useState(1)
  const [sort_order, setSortOrder] = useState(0)

  useEffect(() => {
    if (initial) {
      setWbsCode(initial.wbs_code || '')
      setTitle(initial.title || '')
      setDescription(initial.description || '')
      setLevelNum(initial.level_num || 1)
      setSortOrder(initial.sort_order || 0)
    } else {
      setWbsCode('')
      setTitle('')
      setDescription('')
      setLevelNum(1)
      setSortOrder(0)
    }
  }, [initial])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-white">{initial ? 'Edit WBS node' : 'New WBS node'}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">WBS code</label>
            <input value={wbs_code} onChange={(e) => setWbsCode(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Level</label>
              <input type="number" min={1} max={20} value={level_num} onChange={(e) => setLevelNum(Number(e.target.value))} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Sort order</label>
              <input type="number" value={sort_order} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800">
            Cancel
          </button>
          <button
            type="button"
            disabled={!title.trim()}
            onClick={() =>
              onSubmit({
                id: initial?.id,
                parent_id: initial?.parent_id ?? parentId ?? null,
                wbs_code,
                title: title.trim(),
                description,
                level_num,
                sort_order,
              })
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
