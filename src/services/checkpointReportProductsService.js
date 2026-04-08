import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Products Service
 * Handles product/deliverable tracking for Checkpoint Reports
 */

/**
 * Add Product to Checkpoint Report
 * @param {string} reportId - Report ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export async function addProduct(reportId, productData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get max display_order
    const { data: existing } = await supabase
      .from('checkpoint_report_products')
      .select('display_order')
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const insertData = {
      ...productData,
      checkpoint_report_id: reportId,
      display_order: productData.display_order || (existing?.display_order || 0) + 1,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_products')
      .insert(insertData)
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * Update Product
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(productId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('checkpoint_report_products')
      .update(updateData)
      .eq('id', productId)
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Delete Product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    const { error } = await supabase
      .from('checkpoint_report_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Get Products by Report
 * @param {string} reportId - Report ID
 * @param {string} periodType - Optional: 'current' or 'next'
 * @returns {Promise<Array>} Array of products
 */
export async function getProductsByReport(reportId, periodType = null) {
  try {
    let query = supabase
      .from('checkpoint_report_products')
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('display_order', { ascending: true });

    if (periodType) {
      query = query.eq('period_type', periodType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Get Products In Development
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of products
 */
export async function getProductsInDevelopment(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_products')
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .eq('product_status', 'in_development')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products in development:', error);
    throw error;
  }
}

/**
 * Get Products Completed
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of products
 */
export async function getProductsCompleted(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_products')
      .select(`
        *,
        owner:owner_id(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .eq('product_status', 'completed')
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching completed products:', error);
    throw error;
  }
}

/**
 * Reorder Products
 * @param {string} reportId - Report ID
 * @param {Array} productOrders - Array of {id, display_order}
 * @returns {Promise<void>}
 */
export async function reorderProducts(reportId, productOrders) {
  try {
    const updates = productOrders.map(({ id, display_order }) => ({
      id,
      display_order
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('checkpoint_report_products')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
        .eq('checkpoint_report_id', reportId);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Error reordering products:', error);
    throw error;
  }
}
