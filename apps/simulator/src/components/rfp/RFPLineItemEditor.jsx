/**
 * RFPLineItemEditor - Add, edit, delete line items on RFP Edit page
 * Full CRUD table: title with count, Add Item, Bulk Import, searchable table with Edit/Delete per row
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Upload } from 'lucide-react'
import * as defaultRfpService from '../../services/rfpService'
import RFPLineItemsTable from './RFPLineItemsTable'
import RFPLineItemForm from './RFPLineItemForm'

export default function RFPLineItemEditor({ rfpId, basePath = '/pmo', rfpService: rfpServiceProp }) {
  const navigate = useNavigate()
  const rfpService = rfpServiceProp || defaultRfpService
  const { getLineItems, createLineItem, updateLineItem, deleteLineItem } = rfpService

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const loadItems = useCallback(async () => {
    if (!rfpId) return
    try {
      setLoading(true)
      const data = await getLineItems(rfpId)
      setItems(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [rfpId, getLineItems])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const nextItemNumber = items.length > 0
    ? Math.max(...items.map((i) => i.item_number || 0), 0) + 1
    : 1

  const handleSaveNew = async (payload) => {
    try {
      await createLineItem({ ...payload, rfp_id: rfpId })
      await loadItems()
      setShowAddForm(false)
    } catch (err) {
      alert(err.message || 'Failed to add line item')
    }
  }

  const handleSaveEdit = async (payload) => {
    if (!editingItem?.id) return
    try {
      await updateLineItem(editingItem.id, payload)
      await loadItems()
      setEditingItem(null)
    } catch (err) {
      alert(err.message || 'Failed to update line item')
    }
  }

  const handleDelete = async (item) => {
    if (!confirm('Delete this line item?')) return
    try {
      await deleteLineItem(item.id)
      await loadItems()
    } catch (err) {
      alert(err.message || 'Failed to delete')
    }
  }

  const handleImport = () => navigate(`${basePath}/rfp/${rfpId}/import`)

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading line items...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items ({items.length})</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddForm(true)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </button>
          <button onClick={handleImport} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Upload className="w-4 h-4 mr-2" /> Bulk Import
          </button>
        </div>
      </div>

      <RFPLineItemsTable
        items={items}
        readOnly={false}
        onEdit={(item) => setEditingItem(item)}
        onDelete={handleDelete}
      />

      {showAddForm && (
        <RFPLineItemForm
          nextItemNumber={nextItemNumber}
          onSave={handleSaveNew}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingItem && (
        <RFPLineItemForm
          item={editingItem}
          onSave={handleSaveEdit}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
