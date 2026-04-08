/**
 * Configuration Item Form Component
 * Form for creating/editing Configuration Items
 */

import { useState, useEffect } from 'react'
import { Package, AlertCircle, CheckCircle } from 'lucide-react'
import { HoldButton } from '../ui/HoldButton'

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
  saving = false
}) {
  const [itemTypes, setItemTypes] = useState([])
  const [identificationMethods, setIdentificationMethods] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (cfgMsId) {
      fetchStrategyData()
    }
  }, [cfgMsId])

  const fetchStrategyData = async () => {
    // Fetch item types and identification methods from strategy
    // This would use the services we created
    // For now, placeholder
  }

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...itemData, [field]: value })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Configuration Item Details
        </h2>

        <div className="space-y-6">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={itemData.item_name || ''}
              onChange={(e) => handleChange('item_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter configuration item name..."
            />
            {errors.item_name && <p className="text-red-500 text-sm mt-1">{errors.item_name}</p>}
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Description
            </label>
            <textarea
              value={itemData.item_description || ''}
              onChange={(e) => handleChange('item_description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe the configuration item..."
            />
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Item Type <span className="text-red-500">*</span>
            </label>
            <select
              value={itemData.item_type_id || ''}
              onChange={(e) => handleChange('item_type_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select item type...</option>
              {itemTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.item_type_name} ({type.item_type_code})
                </option>
              ))}
            </select>
            {errors.item_type_id && <p className="text-red-500 text-sm mt-1">{errors.item_type_id}</p>}
          </div>

          {/* Product Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to Product (Optional)
            </label>
            <select
              value={itemData.product_id || ''}
              onChange={(e) => handleChange('product_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">No product link</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </div>

          {/* Storage Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Storage Location
            </label>
            <input
              type="text"
              value={itemData.storage_location || ''}
              onChange={(e) => handleChange('storage_location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Where is this item stored?"
            />
          </div>

          {/* Repository URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repository URL
            </label>
            <input
              type="url"
              value={itemData.repository_url || ''}
              onChange={(e) => handleChange('repository_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://..."
            />
          </div>

          {/* Auto-generated Identifier */}
          {itemData.configuration_item_identifier && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Configuration Item Identifier</p>
                  <p className="text-lg font-semibold text-blue-700 dark:text-blue-200">
                    {itemData.configuration_item_identifier}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This identifier was automatically generated based on the Configuration Management Strategy
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div>
          {onCancel && (
            <button
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
