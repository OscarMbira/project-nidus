/**
 * Product Description Template Service
 * API functions for managing organization-level Product Description templates
 */

import { supabase } from './supabaseClient'

/**
 * Get all templates for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object>} Templates array
 */
export async function getTemplates(accountId) {
  try {
    const { data, error } = await supabase
      .from('pd_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('template_name', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error getting templates:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Template with all child data
 */
export async function getTemplateById(templateId) {
  try {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from('pd_organization_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_deleted', false)
      .single()

    if (templateError) throw templateError
    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    // Get all child data
    const [criteriaResult, qualityResult, skillsResult, derivationsResult, compositionResult, responsibilitiesResult] = await Promise.all([
      supabase.from('pd_template_acceptance_criteria').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('pd_template_quality_expectations').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('pd_template_skills').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('pd_template_derivations').select('*').eq('template_id', templateId).order('display_order'),
      supabase.from('pd_template_composition_items').select('*').eq('template_id', templateId).order('item_number'),
      supabase.from('pd_template_acceptance_responsibilities').select('*').eq('template_id', templateId).order('display_order')
    ])

    return {
      success: true,
      data: {
        ...template,
        acceptance_criteria: criteriaResult.data || [],
        quality_expectations: qualityResult.data || [],
        skills: skillsResult.data || [],
        derivations: derivationsResult.data || [],
        composition_items: compositionResult.data || [],
        acceptance_responsibilities: responsibilitiesResult.data || []
      }
    }
  } catch (error) {
    console.error('Error getting template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get default template for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object>} Default template or null
 */
export async function getDefaultTemplate(accountId) {
  try {
    const { data, error } = await supabase
      .from('pd_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_default', true)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned

    if (!data) {
      return { success: true, data: null }
    }

    return await getTemplateById(data.id)
  } catch (error) {
    console.error('Error getting default template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create new template
 * @param {string} accountId - Account/Organization ID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(accountId, templateData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }

    const {
      acceptance_criteria,
      quality_expectations,
      skills,
      derivations,
      composition_items,
      acceptance_responsibilities,
      ...templateFields
    } = templateData

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('pd_organization_templates')
      .insert({
        ...templateFields,
        account_id: accountId,
        created_by: userData.id,
        updated_by: userData.id
      })
      .select()
      .single()

    if (templateError) throw templateError

    const templateId = template.id

    // Create child records
    const childPromises = []

    if (acceptance_criteria && acceptance_criteria.length > 0) {
      childPromises.push(
        supabase.from('pd_template_acceptance_criteria').insert(
          acceptance_criteria.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (quality_expectations && quality_expectations.length > 0) {
      childPromises.push(
        supabase.from('pd_template_quality_expectations').insert(
          quality_expectations.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (skills && skills.length > 0) {
      childPromises.push(
        supabase.from('pd_template_skills').insert(
          skills.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (derivations && derivations.length > 0) {
      childPromises.push(
        supabase.from('pd_template_derivations').insert(
          derivations.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (composition_items && composition_items.length > 0) {
      childPromises.push(
        supabase.from('pd_template_composition_items').insert(
          composition_items.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (acceptance_responsibilities && acceptance_responsibilities.length > 0) {
      childPromises.push(
        supabase.from('pd_template_acceptance_responsibilities').insert(
          acceptance_responsibilities.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      )
    }

    if (childPromises.length > 0) {
      const results = await Promise.all(childPromises)
      const errors = results.filter(r => r.error).map(r => r.error)
      if (errors.length > 0) {
        throw new Error('Error creating child records: ' + errors.map(e => e.message).join(', '))
      }
    }

    return await getTemplateById(templateId)
  } catch (error) {
    console.error('Error creating template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }

    const {
      acceptance_criteria,
      quality_expectations,
      skills,
      derivations,
      composition_items,
      acceptance_responsibilities,
      ...templateFields
    } = updates

    // Update template
    if (Object.keys(templateFields).length > 0) {
      const { error: updateError } = await supabase
        .from('pd_organization_templates')
        .update({
          ...templateFields,
          updated_by: userData.id
        })
        .eq('id', templateId)

      if (updateError) throw updateError
    }

    // Update child records (delete and recreate for simplicity)
    // In production, you might want to do smarter diffing
    if (acceptance_criteria !== undefined) {
      await supabase.from('pd_template_acceptance_criteria').delete().eq('template_id', templateId)
      if (acceptance_criteria.length > 0) {
        await supabase.from('pd_template_acceptance_criteria').insert(
          acceptance_criteria.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    if (quality_expectations !== undefined) {
      await supabase.from('pd_template_quality_expectations').delete().eq('template_id', templateId)
      if (quality_expectations.length > 0) {
        await supabase.from('pd_template_quality_expectations').insert(
          quality_expectations.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    if (skills !== undefined) {
      await supabase.from('pd_template_skills').delete().eq('template_id', templateId)
      if (skills.length > 0) {
        await supabase.from('pd_template_skills').insert(
          skills.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    if (derivations !== undefined) {
      await supabase.from('pd_template_derivations').delete().eq('template_id', templateId)
      if (derivations.length > 0) {
        await supabase.from('pd_template_derivations').insert(
          derivations.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    if (composition_items !== undefined) {
      await supabase.from('pd_template_composition_items').delete().eq('template_id', templateId)
      if (composition_items.length > 0) {
        await supabase.from('pd_template_composition_items').insert(
          composition_items.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    if (acceptance_responsibilities !== undefined) {
      await supabase.from('pd_template_acceptance_responsibilities').delete().eq('template_id', templateId)
      if (acceptance_responsibilities.length > 0) {
        await supabase.from('pd_template_acceptance_responsibilities').insert(
          acceptance_responsibilities.map(item => ({
            ...item,
            template_id: templateId,
            created_by: userData.id
          }))
        )
      }
    }

    return await getTemplateById(templateId)
  } catch (error) {
    console.error('Error updating template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete template (soft delete)
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteTemplate(templateId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('pd_organization_templates')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_default: false // Can't be default if deleted
      })
      .eq('id', templateId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting template:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Set template as default
 * @param {string} templateId - Template ID
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object>} Result
 */
export async function setAsDefault(templateId, accountId) {
  try {
    const { data, error } = await supabase.rpc('set_pd_template_as_default', {
      p_template_id: templateId,
      p_account_id: accountId
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error setting template as default:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create Product Description from template
 * @param {string} projectId - Project ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Created Product Description
 */
export async function createPDFromTemplate(projectId, templateId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }

    const { data: pdId, error } = await supabase.rpc('create_pd_from_template', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_user_id: userData.id
    })

    if (error) throw error

    // Import the function from productDescriptionService
    const { getProductDescriptionById } = await import('./productDescriptionService')
    return await getProductDescriptionById(pdId)
  } catch (error) {
    console.error('Error creating Product Description from template:', error)
    return { success: false, error: error.message }
  }
}
