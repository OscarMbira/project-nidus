/**
 * Configuration Item Audit Service
 * API functions for managing configuration audits
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Create audit
 * @param {string} projectId - Project ID
 * @param {string} cfgMsId - Configuration Management Strategy ID
 * @param {Object} auditData - Audit data
 * @param {Array<string>} itemIds - Configuration item IDs to audit (optional)
 * @returns {Promise<Object>} Created audit
 */
export async function createAudit(projectId, cfgMsId, auditData, itemIds = []) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Generate audit reference if not provided
    let auditReference = auditData.audit_reference;
    if (!auditReference) {
      const year = new Date().getFullYear();
      const { data: existing } = await platformDb
        .from('configuration_item_audits')
        .select('audit_reference')
        .like('audit_reference', `AUD-${year}-%`)
        .order('audit_reference', { ascending: false })
        .limit(1);

      const nextSeq = existing && existing.length > 0
        ? parseInt(existing[0].audit_reference.split('-')[2]) + 1
        : 1;

      auditReference = `AUD-${year}-${String(nextSeq).padStart(3, '0')}`;
    }

    const insertData = {
      ...auditData,
      project_id: projectId,
      cfg_ms_id: cfgMsId,
      audit_reference: auditReference,
      auditor_user_id: auditData.auditor_user_id || userRecord.id,
      configuration_items_audited: itemIds.length > 0 ? itemIds : null,
      created_by: userRecord.id,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('configuration_item_audits')
      .insert(insertData)
      .select(`
        *,
        project:project_id(id, project_name),
        cfg_ms:cfg_ms_id(id, cms_reference),
        audit_type_procedure:audit_type_id(id, audit_name, audit_type),
        auditor:auditor_user_id(id, full_name, email),
        baseline:baseline_id(id, baseline_identifier, baseline_name)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating audit:', error);
    throw error;
  }
}

/**
 * Get audit by ID
 * @param {string} auditId - Audit ID
 * @returns {Promise<Object>} Audit
 */
export async function getAuditById(auditId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_audits')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        cfg_ms:cfg_ms_id(id, cms_reference),
        audit_type_procedure:audit_type_id(id, audit_name, audit_type),
        auditor:auditor_user_id(id, full_name, email),
        baseline:baseline_id(id, baseline_identifier, baseline_name),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .eq('id', auditId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching audit by ID:', error);
    throw error;
  }
}

/**
 * Get audits by project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Audits
 */
export async function getAuditsByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_audits')
      .select(`
        *,
        audit_type_procedure:audit_type_id(id, audit_name),
        auditor:auditor_user_id(id, full_name, email),
        baseline:baseline_id(id, baseline_identifier)
      `)
      .eq('project_id', projectId)
      .order('audit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audits by project:', error);
    throw error;
  }
}

/**
 * Get audits by Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Audits
 */
export async function getAuditsByItem(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_audits')
      .select(`
        *,
        audit_type_procedure:audit_type_id(id, audit_name),
        auditor:auditor_user_id(id, full_name, email)
      `)
      .contains('configuration_items_audited', [itemId])
      .order('audit_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audits by item:', error);
    throw error;
  }
}

/**
 * Update audit
 * @param {string} auditId - Audit ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated audit
 */
export async function updateAudit(auditId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const updateData = {
      ...updates,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('configuration_item_audits')
      .update(updateData)
      .eq('id', auditId)
      .select(`
        *,
        project:project_id(id, project_name),
        audit_type_procedure:audit_type_id(id, audit_name),
        auditor:auditor_user_id(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating audit:', error);
    throw error;
  }
}

/**
 * Add audit item (result for specific configuration item)
 * @param {string} auditId - Audit ID
 * @param {string} itemId - Configuration Item ID
 * @param {string} versionId - Version ID (optional)
 * @param {string} result - Audit result
 * @param {string} findings - Findings (optional)
 * @returns {Promise<Object>} Created audit item
 */
export async function addAuditItem(auditId, itemId, versionId = null, result = 'pending', findings = null) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_audit_items')
      .insert({
        audit_id: auditId,
        configuration_item_id: itemId,
        version_id: versionId,
        audit_result: result,
        audit_findings: findings
      })
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name),
        version:version_id(id, version_number)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding audit item:', error);
    throw error;
  }
}

/**
 * Get audit items
 * @param {string} auditId - Audit ID
 * @returns {Promise<Array>} Audit items
 */
export async function getAuditItems(auditId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_audit_items')
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name),
        version:version_id(id, version_number)
      `)
      .eq('audit_id', auditId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audit items:', error);
    throw error;
  }
}

/**
 * Complete audit
 * @param {string} auditId - Audit ID
 * @param {string} result - Overall audit result
 * @param {string} findings - Overall findings (optional)
 * @returns {Promise<Object>} Updated audit
 */
export async function completeAudit(auditId, result, findings = null) {
  try {
    return await updateAudit(auditId, {
      audit_status: 'completed',
      audit_result: result,
      audit_findings: findings
    });
  } catch (error) {
    console.error('Error completing audit:', error);
    throw error;
  }
}
