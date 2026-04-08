/**
 * QMS Template Service
 * API functions for managing organization-level QMS templates
 */

import { supabase } from './supabaseClient'

/**
 * Create QMS template
 * @param {string} accountId - Account/Organization ID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(accountId, templateData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const insertData = {
      ...templateData,
      account_id: accountId,
      created_by: userData.id,
      updated_by: userData.id,
      is_active: templateData.is_active ?? true
    }

    const { data, error } = await supabase
      .from('qms_organization_templates')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error creating QMS template:', error)
    throw error
  }
}

/**
 * Update QMS template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_organization_templates')
      .update(updateData)
      .eq('id', templateId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating QMS template:', error)
    throw error
  }
}

/**
 * Delete QMS template (soft delete)
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTemplate(templateId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('qms_organization_templates')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', templateId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting QMS template:', error)
    throw error
  }
}

/**
 * Get QMS templates for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Array>} Templates
 */
export async function getTemplates(accountId) {
  try {
    if (!accountId) {
      // Try to get user's account ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userData) return []

      // Get account via projects
      const { data: projectData } = await supabase
        .from('user_projects')
        .select('project:projects(account_id)')
        .eq('user_id', userData.id)
        .eq('is_deleted', false)
        .limit(1)
        .single()

      if (projectData?.project?.account_id) {
        accountId = projectData.project.account_id
      } else {
        // Try as account owner
        const { data: accountData } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_user_id', userData.id)
          .eq('is_deleted', false)
          .limit(1)
          .single()

        if (accountData) {
          accountId = accountData.id
        }
      }

      if (!accountId) return []
    }

    const { data, error } = await supabase
      .from('qms_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('template_name', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching QMS templates:', error)
    throw error
  }
}

/**
 * Get default template for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object|null>} Default template or null
 */
export async function getDefaultTemplate(accountId) {
  try {
    const { data, error } = await supabase
      .from('qms_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_default', true)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error fetching default template:', error)
    throw error
  }
}

/**
 * Set template as default (un-sets other defaults)
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Updated template
 */
export async function setAsDefault(templateId) {
  try {
    return await updateTemplate(templateId, {
      is_default: true
    })
  } catch (error) {
    console.error('Error setting template as default:', error)
    throw error
  }
}

/**
 * Get template by ID with all child data
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Template with standards, methods, metrics, roles
 */
export async function getTemplateById(templateId) {
  try {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('qms_organization_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_deleted', false)
      .single()

    if (templateError) throw templateError

    if (!template) return null

    // Get child data
    const [
      { data: standards },
      { data: methods },
      { data: metrics },
      { data: roles }
    ] = await Promise.all([
      supabase.from('qms_template_standards').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('qms_template_methods').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('qms_template_metrics').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('qms_template_roles').select('*').eq('template_id', templateId).order('display_order')
    ])

    return {
      ...template,
      standards: standards || [],
      methods: methods || [],
      metrics: metrics || [],
      roles: roles || []
    }
  } catch (error) {
    console.error('Error fetching template:', error)
    throw error
  }
}

export default {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplates,
  getDefaultTemplate,
  setAsDefault,
  getTemplateById
}
