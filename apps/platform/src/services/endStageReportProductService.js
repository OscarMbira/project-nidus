/**
 * End Stage Report Product Service
 * Manages product/deliverable status tracking
 */

import { supabase } from './supabaseClient'

/**
 * Add Product Status
 * @param {string} reportId - Report ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product status
 */
export async function addProductStatus(reportId, productData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_stage_report_id: reportId,
      product_id: productData.product_id || null,
      product_name: productData.product_name || 'Unnamed Product',
      product_description: productData.product_description || null,
      completion_status: productData.completion_status || 'not-started',
      quality_status: productData.quality_status || 'pending-approval',
      approval_date: productData.approval_date || null,
      approved_by: productData.approved_by || null,
      handover_status: productData.handover_status || 'pending-handover',
      handover_date: productData.handover_date || null,
      off_specification_details: productData.off_specification_details || null,
      follow_on_actions: productData.follow_on_actions || null,
      display_order: productData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_stage_report_product_status')
      .insert(insertData)
      .select(`
        *,
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Update product counts on report
    await updateProductCounts(reportId)

    return data
  } catch (error) {
    console.error('Error adding product status:', error)
    throw error
  }
}

/**
 * Update Product Status
 * @param {string} productStatusId - Product status ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product status
 */
export async function updateProductStatus(productStatusId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get report ID for updating counts
    const { data: existing } = await supabase
      .from('end_stage_report_product_status')
      .select('end_stage_report_id')
      .eq('id', productStatusId)
      .single()

    const { data, error } = await supabase
      .from('end_stage_report_product_status')
      .update(updates)
      .eq('id', productStatusId)
      .select(`
        *,
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Update product counts on report
    if (existing) {
      await updateProductCounts(existing.end_stage_report_id)
    }

    return data
  } catch (error) {
    console.error('Error updating product status:', error)
    throw error
  }
}

/**
 * Delete Product Status
 * @param {string} productStatusId - Product status ID
 * @returns {Promise<void>}
 */
export async function deleteProductStatus(productStatusId) {
  try {
    // Get report ID before deleting
    const { data: existing } = await supabase
      .from('end_stage_report_product_status')
      .select('end_stage_report_id')
      .eq('id', productStatusId)
      .single()

    const { error } = await supabase
      .from('end_stage_report_product_status')
      .delete()
      .eq('id', productStatusId)

    if (error) throw error

    // Update product counts on report
    if (existing) {
      await updateProductCounts(existing.end_stage_report_id)
    }
  } catch (error) {
    console.error('Error deleting product status:', error)
    throw error
  }
}

/**
 * Get Product Statuses
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Product statuses
 */
export async function getProductStatuses(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_product_status')
      .select(`
        *,
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('end_stage_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching product statuses:', error)
    throw error
  }
}

/**
 * Sync Products from Stage
 * @param {string} reportId - Report ID
 * @param {string} stageId - Stage ID
 * @returns {Promise<Array>} Synced products
 */
export async function syncProductsFromStage(reportId, stageId) {
  try {
    // Get products/deliverables for the stage
    // This would depend on your products table structure
    // For now, we'll use a generic approach
    
    const { data: products, error: productsError } = await supabase
      .from('project_products')
      .select('*')
      .eq('project_id', (await supabase.from('end_stage_reports').select('project_id').eq('id', reportId).single()).data?.project_id)
      .eq('is_deleted', false)

    if (productsError && productsError.code !== 'PGRST116') {
      // If project_products doesn't exist, try other product tables
      console.warn('Could not fetch from project_products, trying alternative...')
    }

    const syncedProducts = []
    if (products && products.length > 0) {
      for (const product of products) {
        try {
          const productStatus = await addProductStatus(reportId, {
            product_id: product.id,
            product_name: product.product_name || product.name,
            product_description: product.description,
            completion_status: product.status === 'completed' ? 'completed' : 'in-progress',
            quality_status: product.quality_status || 'pending-approval'
          })
          syncedProducts.push(productStatus)
        } catch (err) {
          console.error(`Error syncing product ${product.id}:`, err)
        }
      }
    }

    return syncedProducts
  } catch (error) {
    console.error('Error syncing products from stage:', error)
    throw error
  }
}

/**
 * Bulk Update Product Status
 * @param {string} reportId - Report ID
 * @param {Array<Object>} updates - Array of {id, updates} objects
 * @returns {Promise<Array>} Updated products
 */
export async function bulkUpdateProductStatus(reportId, updates) {
  try {
    const updatedProducts = []
    
    for (const update of updates) {
      try {
        const updated = await updateProductStatus(update.id, update.updates)
        updatedProducts.push(updated)
      } catch (err) {
        console.error(`Error updating product ${update.id}:`, err)
      }
    }

    return updatedProducts
  } catch (error) {
    console.error('Error bulk updating product status:', error)
    throw error
  }
}

/**
 * Update Product Counts on Report
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
async function updateProductCounts(reportId) {
  try {
    const { data: products } = await supabase
      .from('end_stage_report_product_status')
      .select('completion_status, quality_status')
      .eq('end_stage_report_id', reportId)

    const counts = {
      products_completed_count: products?.filter(p => p.completion_status === 'completed').length || 0,
      products_approved_count: products?.filter(p => p.quality_status === 'approved').length || 0,
      products_off_specification_count: products?.filter(p => p.quality_status === 'off-specification').length || 0
    }

    await supabase
      .from('end_stage_reports')
      .update(counts)
      .eq('id', reportId)
  } catch (error) {
    console.error('Error updating product counts:', error)
    // Don't throw - this is a background update
  }
}
