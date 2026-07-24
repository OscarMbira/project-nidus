/**
 * Brief Product Service
 * Manages product descriptions for project briefs
 */

import { supabase } from './supabaseClient'

/**
 * Add product to brief
 * @param {string} briefId - Brief ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export async function addProduct(briefId, productData) {
  try {
    const payload = {
      brief_id: briefId,
      product_name: productData.product_name,
      product_description: productData.product_description,
      purpose: productData.purpose || null,
      composition: productData.composition || null,
      derivation: productData.derivation || null,
      format_presentation: productData.format_presentation || null,
      quality_criteria: productData.quality_criteria || null,
      quality_tolerance: productData.quality_tolerance || null,
      quality_method: productData.quality_method || null,
      is_main_product: productData.is_main_product || false,
      display_order: productData.display_order || 0
    }

    const { data, error } = await supabase
      .from('brief_product_descriptions')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding product:', error)
    throw error
  }
}

/**
 * Update product
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(productId, updates) {
  try {
    const { data, error } = await supabase
      .from('brief_product_descriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

/**
 * Delete product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    const { error } = await supabase
      .from('brief_product_descriptions')
      .delete()
      .eq('id', productId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}

/**
 * Get products for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of products
 */
export async function getProducts(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_product_descriptions')
      .select('*')
      .eq('brief_id', briefId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

/**
 * Get main product for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object|null>} Main product or null
 */
export async function getMainProduct(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_product_descriptions')
      .select('*')
      .eq('brief_id', briefId)
      .eq('is_main_product', true)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching main product:', error)
    throw error
  }
}

/**
 * Validate product description completeness
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateProductDescription(productId) {
  try {
    const { data: product, error } = await supabase
      .from('brief_product_descriptions')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) throw error

    const missingFields = []
    if (!product.product_name) missingFields.push('product_name')
    if (!product.product_description) missingFields.push('product_description')
    if (!product.quality_criteria) missingFields.push('quality_criteria')

    return {
      is_valid: missingFields.length === 0,
      missing_fields: missingFields,
      completeness_score: ((3 - missingFields.length) / 3 * 100).toFixed(0)
    }
  } catch (error) {
    console.error('Error validating product:', error)
    throw error
  }
}

export default {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getMainProduct,
  validateProductDescription
}
