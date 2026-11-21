/**
 * Product Form Component
 */

import { useState, useEffect } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { X, Save } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

const PRODUCT_TYPES = [
  { value: 'deliverable', label: 'Deliverable' },
  { value: 'interim_product', label: 'Interim Product' },
  { value: 'management_product', label: 'Management Product' },
  { value: 'specialist_product', label: 'Specialist Product' },
  { value: 'other', label: 'Other' }
]

function ProductFormBody({ product, onSubmit, onCancel, workPackages = [], ppdCompositionItems = [] }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    product_type: 'deliverable',
    acceptance_criteria: '',
    planned_completion_date: '',
    linked_work_package_id: null,
    linked_ppd_composition_item_id: null
  })
  const [formTab, setFormTab] = useState('details')

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        product_description: product.product_description || '',
        product_type: product.product_type || 'deliverable',
        acceptance_criteria: product.acceptance_criteria || '',
        planned_completion_date: product.planned_completion_date || '',
        linked_work_package_id: product.linked_work_package_id || null,
        linked_ppd_composition_item_id: product.linked_ppd_composition_item_id || null
      })
    }
  }, [product])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.product_name) {
      alert('Product name is required')
      return
    }
    onSubmit({
      ...formData,
      linked_work_package_id: formData.linked_work_package_id || null,
      linked_ppd_composition_item_id: formData.linked_ppd_composition_item_id || null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

      {formTab === 'audit' && (
        !product?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this product is saved.</p>
        ) : (
          <AuditDetailsPanel description="How this product is labelled and classified, and when it was created and last changed.">
            <AuditCard title="Identity" description="How this product is labelled and tracked.">
              <AuditField label="Product name" value={formData.product_name || product.product_name} />
              <AuditField label="Type" value={humanizeAuditToken(product.product_type)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this product sits.">
              <AuditField label="Linked work package" value={workPackages.find((wp) => wp.id === (formData.linked_work_package_id || product.linked_work_package_id))?.work_package_name} />
            </AuditCard>
            <AuditCard title="Record history" description="When this product was created and last changed.">
              <AuditTimestampPair dateLabel="Created at" value={product.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={product.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      )}

      {formTab === 'details' && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.stage_plan_products.product_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
            Product Name <span className="text-red-500">*</span>
          </FieldLabelWithHelp>
          <input
            type="text"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter product name"
            required
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.stage_plan_products.product_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Type
          </FieldLabelWithHelp>
          <select
            value={formData.product_type}
            onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PRODUCT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.stage_plan_products.planned_completion_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planned Completion Date
          </FieldLabelWithHelp>
          <input
            type="date"
            value={formData.planned_completion_date}
            onChange={(e) => setFormData({ ...formData, planned_completion_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.stage_plan_products.linked_work_package_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            Link to Work Package
          </FieldLabelWithHelp>
          <select
            value={formData.linked_work_package_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_work_package_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {workPackages.map(wp => (
              <option key={wp.id} value={wp.id}>
                {wp.work_package_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabelWithHelp helpKey="public.stage_plan_products.linked_ppd_composition_item_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
            Link to PPD Composition Item
          </FieldLabelWithHelp>
          <select
            value={formData.linked_ppd_composition_item_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_ppd_composition_item_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {ppdCompositionItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.product_name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.stage_plan_products.product_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </FieldLabelWithHelp>
          <textarea
            value={formData.product_description}
            onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter product description"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabelWithHelp helpKey="public.stage_plan_products.acceptance_criteria" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Acceptance Criteria
          </FieldLabelWithHelp>
          <textarea
            value={formData.acceptance_criteria}
            onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter acceptance criteria"
          />
        </div>
      </div>
      </>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {product ? 'Update' : 'Add'} Product
        </button>
      </div>
    </form>
  )
}

// v1345 slice 4: field help for this component (public.stage_plan_products.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'product_name', 'product_type', 'planned_completion_date', 'linked_work_package_id',
  'linked_ppd_composition_item_id', 'product_description', 'acceptance_criteria',
].map((name) => `public.stage_plan_products.${name}`)

export default function ProductForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <ProductFormBody {...props} />
    </FieldHelpScope>
  )
}
