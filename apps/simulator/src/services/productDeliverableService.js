/**
 * Product Deliverable Service
 * API functions for managing product deliverables with Product Description integration
 */

import { supabase } from './supabaseClient'
import { createPDFromProductDeliverable, getProductDescriptionByDeliverable } from './productDescriptionService'
import { createPSAForProductDeliverable, syncFromProductDeliverable } from './productStatusAccountService'

/**
 * Get all product deliverables for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Product deliverables array
 */
export async function getProductDeliverables(projectId) {
  try {
    const { data, error } = await supabase
      .from('product_deliverables')
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, email, full_name),
        work_package:work_package_id(id, work_package_name, work_package_code),
        product_description:product_description_id(
          id,
          pd_reference,
          product_title,
          status,
          version_number
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting product deliverables:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get product deliverable by ID
 * @param {string} deliverableId - Product Deliverable ID
 * @returns {Promise<Object>} Product deliverable
 */
export async function getProductDeliverableById(deliverableId) {
  try {
    const { data, error } = await supabase
      .from('product_deliverables')
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, email, full_name),
        work_package:work_package_id(id, work_package_name, work_package_code),
        product_description:product_description_id(
          id,
          pd_reference,
          product_title,
          status,
          version_number,
          purpose
        )
      `)
      .eq('id', deliverableId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error getting product deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create a new product deliverable
 * @param {string} projectId - Project ID
 * @param {Object} deliverableData - Product deliverable data
 * @returns {Promise<Object>} Created product deliverable
 */
export async function createProductDeliverable(projectId, deliverableData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const insertData = {
      ...deliverableData,
      project_id: projectId,
      status: deliverableData.status || 'not_started'
    }

    const { data, error } = await supabase
      .from('product_deliverables')
      .insert(insertData)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, email, full_name),
        work_package:work_package_id(id, work_package_name, work_package_code),
        product_description:product_description_id(
          id,
          pd_reference,
          product_title,
          status
        )
      `)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating product deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update product deliverable
 * @param {string} deliverableId - Product Deliverable ID
 * @param {Object} updates - Updates to apply
 * @param {boolean} syncPSA - Whether to sync Product Status Account (default: true)
 * @returns {Promise<Object>} Updated product deliverable
 */
export async function updateProductDeliverable(deliverableId, updates, syncPSA = true) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('product_deliverables')
      .update(updates)
      .eq('id', deliverableId)
      .select(`
        *,
        assigned_to:assigned_to_user_id(id, email, full_name),
        work_package:work_package_id(id, work_package_name, work_package_code),
        product_description:product_description_id(
          id,
          pd_reference,
          product_title,
          status
        )
      `)
      .single()

    if (error) throw error

    // Auto-sync Product Status Account if status changed
    if (syncPSA && updates.status) {
      try {
        await syncFromProductDeliverable(deliverableId)
      } catch (psaError) {
        console.error('Error syncing Product Status Account:', psaError)
        // Don't fail the update if PSA sync fails
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error updating product deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Link Product Description to product deliverable
 * @param {string} deliverableId - Product Deliverable ID
 * @param {string} productDescriptionId - Product Description ID
 * @returns {Promise<Object>} Updated product deliverable
 */
export async function linkProductDescription(deliverableId, productDescriptionId) {
  try {
    return await updateProductDeliverable(deliverableId, {
      product_description_id: productDescriptionId
    })
  } catch (error) {
    console.error('Error linking product description:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Unlink Product Description from product deliverable
 * @param {string} deliverableId - Product Deliverable ID
 * @returns {Promise<Object>} Updated product deliverable
 */
export async function unlinkProductDescription(deliverableId) {
  try {
    return await updateProductDeliverable(deliverableId, {
      product_description_id: null
    })
  } catch (error) {
    console.error('Error unlinking product description:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create Product Description from product deliverable
 * @param {string} deliverableId - Product Deliverable ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created Product Description
 */
export async function createProductDescriptionFromDeliverable(deliverableId, userId) {
  try {
    // First create the Product Description
    const pdResult = await createPDFromProductDeliverable(deliverableId, userId)
    
    if (!pdResult.success) {
      return pdResult
    }

    // Then link it to the deliverable
    const linkResult = await linkProductDescription(deliverableId, pdResult.data.id)
    
    if (!linkResult.success) {
      return linkResult
    }

    return pdResult
  } catch (error) {
    console.error('Error creating product description from deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get Product Description for a product deliverable
 * @param {string} deliverableId - Product Deliverable ID
 * @returns {Promise<Object>} Product Description or null
 */
export async function getProductDescriptionForDeliverable(deliverableId) {
  try {
    // First check if directly linked
    const deliverable = await getProductDeliverableById(deliverableId)
    
    if (!deliverable.success || !deliverable.data) {
      return { success: false, error: 'Product deliverable not found' }
    }

    if (deliverable.data.product_description) {
      return { success: true, data: deliverable.data.product_description }
    }

    // Fall back to function lookup
    return await getProductDescriptionByDeliverable(deliverableId)
  } catch (error) {
    console.error('Error getting product description for deliverable:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete product deliverable (soft delete)
 * @param {string} deliverableId - Product Deliverable ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProductDeliverable(deliverableId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('product_deliverables')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', deliverableId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting product deliverable:', error)
    return { success: false, error: error.message }
  }
}