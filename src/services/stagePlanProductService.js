/**
 * Stage Plan Product Service
 * API functions for managing stage plan products/deliverables
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add Product
 * @param {string} stagePlanId - Stage Plan ID
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export async function addProduct(stagePlanId, productData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next product number
    const { data: existing } = await platformDb
      .from('stage_plan_products')
      .select('product_number')
      .eq('stage_plan_id', stagePlanId)
      .order('product_number', { ascending: false })
      .limit(1);

    const nextNumber = existing && existing.length > 0
      ? existing[0].product_number + 1
      : 1;

    // Get next display order
    const { data: existingOrder } = await platformDb
      .from('stage_plan_products')
      .select('display_order')
      .eq('stage_plan_id', stagePlanId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingOrder && existingOrder.length > 0
      ? existingOrder[0].display_order + 1
      : 0;

    const insertData = {
      ...productData,
      stage_plan_id: stagePlanId,
      product_number: productData.product_number ?? nextNumber,
      display_order: productData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('stage_plan_products')
      .insert(insertData)
      .select(`
        *,
        linked_work_package:linked_work_package_id(id, work_package_name),
        linked_product_description:linked_product_description_id(id, product_name),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Product
 * @param {string} productId - Product ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(productId, updates) {
  try {
    const { data, error } = await platformDb
      .from('stage_plan_products')
      .update(updates)
      .eq('id', productId)
      .select(`
        *,
        linked_work_package:linked_work_package_id(id, work_package_name),
        linked_product_description:linked_product_description_id(id, product_name),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Product
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProduct(productId) {
  try {
    const { error } = await platformDb
      .from('stage_plan_products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Products
 * @param {string} stagePlanId - Stage Plan ID
 * @returns {Promise<Object>} Products
 */
export async function getProducts(stagePlanId) {
  try {
    const { data, error } = await platformDb
      .from('stage_plan_products')
      .select(`
        *,
        linked_work_package:linked_work_package_id(id, work_package_name),
        linked_product_description:linked_product_description_id(id, product_name),
        linked_ppd_composition_item:linked_ppd_composition_item_id(id, product_name)
      `)
      .eq('stage_plan_id', stagePlanId)
      .order('display_order', { ascending: true })
      .order('product_number', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link Product to Work Package
 * @param {string} productId - Product ID
 * @param {string} workPackageId - Work Package ID
 * @returns {Promise<Object>} Update result
 */
export async function linkToWorkPackage(productId, workPackageId) {
  try {
    return await updateProduct(productId, {
      linked_work_package_id: workPackageId
    });
  } catch (error) {
    console.error('Error linking product to work package:', error);
    return { success: false, error: error.message };
  }
}
