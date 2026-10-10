/**
 * Configuration Item Form
 * Details stay on the first tab. Product links, storage locations, and repository URLs
 * each have their own tab and accept more than one value.
 */

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { HoldButton } from '../ui/HoldButton'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { RowActionButton } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import { platformDb } from '../../services/supabaseClient'
import { getItemTypes } from '../../services/cfgItemTypesService'

const FORM_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'products', label: 'Linked products' },
  { value: 'storage', label: 'Storage locations' },
  { value: 'repository', label: 'Repository URLs' },
  { value: 'audit', label: 'Audit details' },
]

function lines(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

async function loadProjectProducts(projectId) {
  const listed = async (table, columns, orderColumn) => {
    const { data, error } = await platformDb
      .from(table)
      .select(columns)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order(orderColumn, { ascending: true })
    if (error) return []
    return data || []
  }

  const [deliverables, descriptions, projectProduct] = await Promise.all([
    listed('product_deliverables', 'id, product_name', 'product_name'),
    listed('product_descriptions', 'id, product_title', 'product_title'),
    platformDb
      .from('project_product_descriptions')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle(),
  ])

  let composition = []
  if (projectProduct?.data?.id) {
    const { data } = await platformDb
      .from('ppd_composition_items')
      .select('id, product_name')
      .eq('ppd_id', projectProduct.data.id)
      .eq('is_deleted', false)
      .order('product_name', { ascending: true })
    composition = data || []
  }

  const rows = [
    ...deliverables.map((row) => ({ id: row.id, label: row.product_name })),
    ...descriptions.map((row) => ({ id: row.id, label: row.product_title })),
    ...composition.map((row) => ({ id: row.id, label: row.product_name })),
  ]
  const seen = new Set()
  return rows
    .filter((row) => row.id && row.label && !seen.has(row.id) && seen.add(row.id))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

function ProductLinkList({ products, value, onChange }) {
  const ids = lines(value)
  const [pick, setPick] = useState('')
  const remaining = products.filter((product) => !ids.includes(product.id))

  const add = () => {
    if (!pick || ids.includes(pick)) return
    onChange([...ids, pick].join('\n'))
    setPick('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectField
            forceSearchable
            value={pick}
            onChange={setPick}
            placeholder="Select a product..."
            searchPlaceholder="Search products..."
            options={remaining.map((product) => ({
              value: product.id,
              label: product.label || 'Untitled product',
            }))}
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!pick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {ids.length === 0 ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">No products linked.</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
          {ids.map((id, index) => {
            const product = products.find((row) => row.id === id)
            return (
              <li key={id} className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-gray-800">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {index + 1}. {product?.label || 'Linked product'}
                </span>
                <RowActionButton variant="delete" label="Remove product" onClick={() => onChange(ids.filter((item) => item !== id).join('\n'))} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function ConfigurationItemForm({
  itemData = {},
  cfgMsId,
  projectId,
  itemId = null,
  onChange,
  errors = {},
  onSave,
  onCancel,
  onHoldComplete,
  saving = false,
}) {
  const [itemTypes, setItemTypes] = useState([])
  const [products, setProducts] = useState([])
  const [formTab, setFormTab] = useState('details')

  useEffect(() => {
    if (errors.item_name || errors.item_type_id) setFormTab('details')
  }, [errors])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [types, productRows] = await Promise.all([
        cfgMsId ? getItemTypes(cfgMsId).catch(() => []) : Promise.resolve([]),
        projectId ? loadProjectProducts(projectId).catch(() => []) : Promise.resolve([]),
      ])
      if (cancelled) return
      setItemTypes(Array.isArray(types) ? types : [])
      setProducts(productRows)
    })()
    return () => { cancelled = true }
  }, [cfgMsId, projectId])

  const setFields = (patch) => {
    onChange?.({ ...itemData, ...patch })
  }

  return (
    <div className="space-y-6">
      <DetailAuditTabList
        activeTab={formTab}
        onChange={setFormTab}
        tabs={FORM_TABS}
        ariaLabel="Configuration item sections"
      />

      {formTab === 'audit' && (
        !itemData?.id ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this configuration item is saved.</p>
          </div>
        ) : (
          <AuditDetailsPanel description="Who created or changed this configuration item, and how it is classified.">
            <AuditCard title="Identity" description="How this configuration item is labelled and tracked.">
              <AuditField label="Identifier" value={itemData.configuration_item_identifier} />
              <AuditField label="Name" value={itemData.item_name} />
              <AuditField label="Type" value={itemData.item_type?.item_type_name || itemTypes.find((type) => type.id === itemData.item_type_id)?.item_type_name} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this configuration item sits.">
              <AuditField label="Project" value={itemData.project?.project_name} />
              <AuditField label="Strategy" value={itemData.cfg_ms?.cms_reference} />
            </AuditCard>
            <AuditCard title="Record history" description="When this configuration item was created and last changed.">
              <AuditField label="Created by" value={itemData.created_by_user?.full_name || itemData.created_by_user?.email} />
              <AuditTimestampPair dateLabel="Created at" value={itemData.created_at} />
              <AuditField label="Updated by" value={itemData.updated_by_user?.full_name || itemData.updated_by_user?.email} />
              <AuditTimestampPair dateLabel="Last updated" value={itemData.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Configuration Item Details</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={itemData.item_name || ''}
                onChange={(e) => setFields({ item_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter configuration item name..."
              />
              {errors.item_name && <p className="text-red-500 text-sm mt-1">{errors.item_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Description</label>
              <textarea
                value={itemData.item_description || ''}
                onChange={(e) => setFields({ item_description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the configuration item..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Type <span className="text-red-500">*</span>
              </label>
              <SelectField
                forceSearchable
                value={itemData.item_type_id || ''}
                onChange={(value) => {
                  const type = itemTypes.find((row) => row.id === value)
                  setFields({ item_type_id: value, item_type_code: type?.item_type_code || '' })
                }}
                placeholder="Select item type..."
                searchPlaceholder="Search item types..."
                options={itemTypes.map((type) => ({
                  value: type.id,
                  label: type.item_type_code ? `${type.item_type_name} (${type.item_type_code})` : type.item_type_name,
                }))}
              />
              {itemTypes.length === 0 && (
                <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">
                  No item types yet. Add them from Configuration Item Types in the sidebar.
                </p>
              )}
              {errors.item_type_id && <p className="text-red-500 text-sm mt-1">{errors.item_type_id}</p>}
            </div>
            {itemData.configuration_item_identifier && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Configuration Item Identifier</p>
                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-200">{itemData.configuration_item_identifier}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {formTab === 'products' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Linked products</h2>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-4">Link one or more products from this project. This is optional.</p>
          {products.length === 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">No products are recorded for this project yet.</p>
          )}
          <ProductLinkList
            products={products}
            value={itemData.product_id_list || itemData.product_id || ''}
            onChange={(next) => setFields({ product_id_list: next })}
          />
        </div>
      )}

      {formTab === 'storage' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Storage locations</h2>
          <MultiLineListInput
            viewModeId="configuration-item-storage-locations"
            value={itemData.storage_location || ''}
            onChange={(next) => setFields({ storage_location: next })}
            placeholder="Where is this item stored?"
            itemColumnLabel="Storage location"
            ariaLabelPrefix="Storage location"
          />
        </div>
      )}

      {formTab === 'repository' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Repository URLs</h2>
          <MultiLineListInput
            viewModeId="configuration-item-repository-urls"
            value={itemData.repository_url || ''}
            onChange={(next) => setFields({ repository_url: next })}
            placeholder="https://..."
            itemColumnLabel="Repository URL"
            ariaLabelPrefix="Repository URL"
          />
        </div>
      )}

      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <HoldButton
            entityType="configuration_item"
            entityId={itemId}
            formData={itemData}
            projectId={projectId}
            onHoldComplete={onHoldComplete || onCancel}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !itemData.item_name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Configuration Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
