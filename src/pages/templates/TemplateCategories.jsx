import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { listAllTemplateCategoriesForManage, upsertTemplateCategory, deleteTemplateCategory } from '../../services/templateLibraryService'

const BASE = '/platform/templates'

export default function TemplateCategories() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({ category_code: '', category_name: '', description: '', sort_order: 0 })
  const [success, setSuccess] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await listAllTemplateCategoriesForManage()
    if (error) setErr(error.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const add = async (e) => {
    e.preventDefault()
    setErr(null)
    if (!form.category_code.trim() || !form.category_name.trim()) {
      setErr('Code and name required')
      return
    }
    const { data, error } = await upsertTemplateCategory({
      category_code: form.category_code.trim(),
      category_name: form.category_name.trim(),
      description: form.description || null,
      sort_order: Number(form.sort_order) || 0,
    })
    if (error) setErr(error.message)
    else {
      setSuccess({ id: data.id, op: 'created' })
      setForm({ category_code: '', category_name: '', description: '', sort_order: 0 })
      load()
    }
  }

  const del = async (id) => {
    if (!window.confirm('Deactivate category?')) return
    const { error } = await deleteTemplateCategory(id)
    if (error) setErr(error.message)
    else load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Template categories</h1>
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-green-800 dark:text-green-200">
          Category {success.op}. ID: {success.id}
        </div>
      )}
      {err && <p className="text-red-600 mb-4">{err}</p>}
      <form onSubmit={add} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-8 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> New category
        </h2>
        <input
          placeholder="category_code"
          value={form.category_code}
          onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
        <input
          placeholder="Category name"
          value={form.category_name}
          onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
        <input
          placeholder="Sort order"
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
          rows={2}
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-white">
          Save
        </button>
      </form>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800"
            >
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{r.category_name}</span>
                <span className="text-sm text-gray-500 ml-2">{r.category_code}</span>
                {r.is_active === false && <span className="ml-2 text-xs text-amber-600">inactive</span>}
              </div>
              <button type="button" onClick={() => del(r.id)} className="text-sm text-red-600">
                Deactivate
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
