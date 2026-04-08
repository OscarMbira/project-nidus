/**
 * Product Description Introduction Section
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function PDIntroductionSection({ formData, onChange, errors, mode, projectId }) {
  const [productDeliverables, setProductDeliverables] = useState([])
  const [ppdCompositionItems, setPpdCompositionItems] = useState([])
  const [configurationItems, setConfigurationItems] = useState([])
  const [teamMembers, setTeamMembers] = useState([])

  useEffect(() => {
    if (projectId) {
      loadRelatedData()
    }
  }, [projectId])

  const loadRelatedData = async () => {
    try {
      // Load product deliverables
      const { data: pdData } = await supabase
        .from('product_deliverables')
        .select('id, product_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setProductDeliverables(pdData || [])

      // Load PPD composition items
      const { data: ppdData } = await supabase
        .from('project_product_descriptions')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()

      if (ppdData) {
        const { data: compData } = await supabase
          .from('ppd_composition_items')
          .select('id, product_name')
          .eq('ppd_id', ppdData.id)
          .eq('is_deleted', false)
        setPpdCompositionItems(compData || [])
      }

      // Load configuration items (if available)
      const { data: ciData } = await supabase
        .from('configuration_items')
        .select('id, item_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setConfigurationItems(ciData || [])

      // Load team members
      const { data: membersData } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setTeamMembers((membersData || []).map(m => m.user).filter(Boolean))
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Introduction</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.product_title || ''}
            onChange={(e) => onChange('product_title', e.target.value)}
            disabled={mode === 'view'}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.product_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Enter product name"
          />
          {errors.product_title && (
            <p className="mt-1 text-sm text-red-500">{errors.product_title}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Purpose <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.purpose || ''}
            onChange={(e) => onChange('purpose', e.target.value)}
            disabled={mode === 'view'}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="Describe the purpose the product will fulfill and who will use it (minimum 50 characters)"
          />
          {errors.purpose && (
            <p className="mt-1 text-sm text-red-500">{errors.purpose}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Product Deliverable
          </label>
          <select
            value={formData.product_deliverable_id || ''}
            onChange={(e) => onChange('product_deliverable_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {productDeliverables.map(deliverable => (
              <option key={deliverable.id} value={deliverable.id}>
                {deliverable.product_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to PPD Composition Item
          </label>
          <select
            value={formData.ppd_composition_item_id || ''}
            onChange={(e) => onChange('ppd_composition_item_id', e.target.value || null)}
            disabled={mode === 'view'}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Configuration Item
          </label>
          <select
            value={formData.configuration_item_id || ''}
            onChange={(e) => onChange('configuration_item_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {configurationItems.map(ci => (
              <option key={ci.id} value={ci.id}>
                {ci.item_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Author
          </label>
          <select
            value={formData.author_id || ''}
            onChange={(e) => onChange('author_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select author</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Owner (Product Owner)
          </label>
          <select
            value={formData.owner_id || ''}
            onChange={(e) => onChange('owner_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select owner</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client
          </label>
          <select
            value={formData.client_id || ''}
            onChange={(e) => onChange('client_id', e.target.value || null)}
            disabled={mode === 'view'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select client</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
