/**
 * Product Description Service
 * API functions for managing individual Product Descriptions
 */

import { supabase } from './supabaseClient';

/**
 * Create a new Product Description
 * @param {string} projectId - Project ID
 * @param {Object} pdData - Product Description data
 * @returns {Promise<Object>} Created Product Description
 */
export async function createProductDescription(projectId, pdData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    const insertData = {
      ...pdData,
      project_id: projectId,
      author_id: pdData.author_id || userData.id,
      owner_id: pdData.owner_id || userData.id,
      created_by: userData.id,
      updated_by: userData.id,
      status: pdData.status || 'draft',
      version_number: pdData.version_number || '1.0'
    };

    const { data, error } = await supabase
      .from('product_descriptions')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_deliverable:product_deliverable_id(id, product_name),
        ppd_composition_item:ppd_composition_item_id(id, product_name),
        configuration_item:configuration_item_id(id, item_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating product description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Product Description from Product Deliverable
 * @param {string} productDeliverableId - Product Deliverable ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created Product Description
 */
export async function createPDFromProductDeliverable(productDeliverableId, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Use database function to create Product Description
    const { data: pdId, error } = await supabase.rpc(
      'create_pd_for_product_deliverable',
      {
        p_product_deliverable_id: productDeliverableId,
        p_user_id: userData.id
      }
    );

    if (error) throw error;

    // Get the created Product Description
    return await getProductDescriptionById(pdId);
  } catch (error) {
    console.error('Error creating product description from deliverable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Product Description from PPD Composition Item
 * @param {string} ppdCompositionItemId - PPD Composition Item ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created Product Description
 */
export async function createPDFromPPDCompositionItem(ppdCompositionItemId, userId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Use database function to create Product Description
    const { data: pdId, error } = await supabase.rpc(
      'create_pd_from_ppd_composition_item',
      {
        p_ppd_composition_item_id: ppdCompositionItemId,
        p_user_id: userData.id
      }
    );

    if (error) throw error;

    // Get the created Product Description
    return await getProductDescriptionById(pdId);
  } catch (error) {
    console.error('Error creating product description from PPD composition item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Product Description by ID
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Product Description
 */
export async function getProductDescriptionById(pdId) {
  try {
    const { data, error } = await supabase
      .from('product_descriptions')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_deliverable:product_deliverable_id(id, product_name),
        ppd_composition_item:ppd_composition_item_id(id, product_name),
        configuration_item:configuration_item_id(id, item_name)
      `)
      .eq('id', pdId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting product description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Product Descriptions by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Product Descriptions array
 */
export async function getProductDescriptionByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('product_descriptions')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        product_deliverable:product_deliverable_id(id, product_name),
        ppd_composition_item:ppd_composition_item_id(id, product_name)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting product descriptions by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Product Description by Product Deliverable
 * @param {string} productDeliverableId - Product Deliverable ID
 * @returns {Promise<Object>} Product Description
 */
export async function getProductDescriptionByDeliverable(productDeliverableId) {
  try {
    const { data: pdId, error } = await supabase.rpc(
      'get_pd_by_product_deliverable',
      {
        p_product_deliverable_id: productDeliverableId
      }
    );

    if (error) throw error;

    if (!pdId) {
      return { success: true, data: null };
    }

    return await getProductDescriptionById(pdId);
  } catch (error) {
    console.error('Error getting product description by deliverable:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Product Description by Composition Item
 * @param {string} ppdCompositionItemId - PPD Composition Item ID
 * @returns {Promise<Object>} Product Description
 */
export async function getProductDescriptionByCompositionItem(ppdCompositionItemId) {
  try {
    const { data: pdId, error } = await supabase.rpc(
      'get_pd_by_composition_item',
      {
        p_ppd_composition_item_id: ppdCompositionItemId
      }
    );

    if (error) throw error;

    if (!pdId) {
      return { success: true, data: null };
    }

    return await getProductDescriptionById(pdId);
  } catch (error) {
    console.error('Error getting product description by composition item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Product Description
 * @param {string} pdId - Product Description ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated Product Description
 */
export async function updateProductDescription(pdId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('product_descriptions')
      .update(updateData)
      .eq('id', pdId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        product_deliverable:product_deliverable_id(id, product_name),
        ppd_composition_item:ppd_composition_item_id(id, product_name),
        configuration_item:configuration_item_id(id, item_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating product description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Product Description (soft delete, only drafts)
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProductDescription(pdId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if it's a draft
    const { data: pd } = await supabase
      .from('product_descriptions')
      .select('status')
      .eq('id', pdId)
      .eq('is_deleted', false)
      .single();

    if (!pd) {
      return { success: false, error: 'Product Description not found' };
    }

    if (pd.status !== 'draft') {
      return { success: false, error: 'Only draft Product Descriptions can be deleted' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const { error } = await platformDb
      .from('product_descriptions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', pdId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting product description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit Product Description for Approval
 * @param {string} pdId - Product Description ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Result
 */
export async function submitForApproval(pdId, approverIds) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update status
    const { error: updateError } = await supabase
      .from('product_descriptions')
      .update({ status: 'under_review' })
      .eq('id', pdId);

    if (updateError) throw updateError;

    // Create approval records
    const { data: pd } = await supabase
      .from('product_descriptions')
      .select('version_number')
      .eq('id', pdId)
      .single();

    const approvals = approverIds.map(approverId => ({
      product_description_id: pdId,
      approver_id: approverId,
      version_approved: pd.version_number,
      approval_status: 'pending'
    }));

    const { error: approvalError } = await supabase
      .from('pd_approvals')
      .insert(approvals);

    if (approvalError) throw approvalError;

    return { success: true };
  } catch (error) {
    console.error('Error submitting for approval:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve Product Description
 * @param {string} approvalId - Approval record ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Result
 */
export async function approveProductDescription(approvalId, approverId, comments) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    // Update approval record
    const { data: approval, error: approvalError } = await platformDb
      .from('pd_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments,
        approver_name: userData.full_name
      })
      .eq('id', approvalId)
      .select('product_description_id')
      .single();

    if (approvalError) throw approvalError;

    // Check if all approvals are complete
    const { data: allApprovals } = await supabase
      .from('pd_approvals')
      .select('approval_status')
      .eq('product_description_id', approval.product_description_id)
      .eq('approval_status', 'pending');

    // If no pending approvals, mark as approved
    if (!allApprovals || allApprovals.length === 0) {
      const { error: updateError } = await supabase
        .from('product_descriptions')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: userData.id
        })
        .eq('id', approval.product_description_id);

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving product description:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Product Description Completeness
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateCompleteness(pdId) {
  try {
    const { data, error } = await supabase.rpc(
      'validate_pd_completeness',
      {
        p_pd_id: pdId
      }
    );

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error validating completeness:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Acceptance Criteria Quality
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateAcceptanceCriteriaQuality(pdId) {
  try {
    const { data, error } = await supabase.rpc(
      'validate_acceptance_criteria_quality',
      {
        p_pd_id: pdId
      }
    );

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error validating acceptance criteria quality:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Revision History
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Revision history
 */
export async function getRevisionHistory(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('product_description_id', pdId)
      .order('revision_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting revision history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add Revision
 * @param {string} pdId - Product Description ID
 * @param {Object} revisionData - Revision data
 * @returns {Promise<Object>} Created revision
 */
export async function addRevision(pdId, revisionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    // Get current version
    const { data: pd } = await supabase
      .from('product_descriptions')
      .select('version_number')
      .eq('id', pdId)
      .single();

    // Increment version
    const versionParts = (pd.version_number || '1.0').split('.');
    const newVersion = versionParts[0] + '.' + (parseInt(versionParts[1] || 0) + 1);

    // Update Product Description version
    await supabase
      .from('product_descriptions')
      .update({ version_number: newVersion })
      .eq('id', pdId);

    // Create revision record
    const { data, error } = await supabase
      .from('pd_revision_history')
      .insert({
        product_description_id: pdId,
        revision_date: new Date().toISOString().split('T')[0],
        previous_revision_date: revisionData.previous_revision_date,
        summary_of_changes: revisionData.summary_of_changes,
        changes_marked: revisionData.changes_marked,
        revised_by: userData.id,
        change_request_id: revisionData.change_request_id
      })
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding revision:', error);
    return { success: false, error: error.message };
  }
}
