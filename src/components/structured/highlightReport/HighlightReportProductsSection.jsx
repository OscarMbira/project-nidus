import { useState, useEffect } from 'react'
import { Package, Plus, Trash2 } from 'lucide-react'
import * as productService from '../../../services/highlightReportProductService'

const PERIOD_TYPES = [
  { value: 'completed_this_period', label: 'Completed this period' },
  { value: 'planned_next_period', label: 'Planned next period' },
  { value: 'carried_forward', label: 'Carried forward' }
]

const COMPLETION_STATUS = [
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'on-hold', label: 'On hold' }
]

export default function HighlightReportProductsSection({ reportId, mode }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await productService.getProducts(reportId)
      setProducts(data || [])
    } catch (e) {
      console.warn('Load products:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await productService.addProduct(reportId, {
        product_name: 'New product',
        period_type: 'completed_this_period',
        completion_status: 'not-started'
      })
      await load()
    } catch (e) {
      console.warn('Add product:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await productService.updateProduct(id, updates)
      await load()
    } catch (e) {
      console.warn('Update product:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await productService.deleteProduct(id)
      await load()
    } catch (e) {
      console.warn('Delete product:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Products / Deliverables
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Completed this period, planned next period, or carried forward.
        </p>
      </div>

      {reportId && (
        <>
          {!disabled && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add product'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No products. Add one to track deliverables.</p>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={p.product_name || ''}
                      onChange={(e) => handleUpdate(p.id, { product_name: e.target.value })}
                      disabled={disabled}
                      placeholder="Product name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={p.period_type || 'completed_this_period'}
                      onChange={(e) => handleUpdate(p.id, { period_type: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {PERIOD_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={p.completion_status || 'not-started'}
                      onChange={(e) => handleUpdate(p.id, { completion_status: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {COMPLETION_STATUS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3 flex gap-2">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!reportId && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to add products.</p>
      )}
    </div>
  )
}
