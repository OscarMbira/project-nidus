/**
 * Brief Validation Service
 * Validates brief completeness, quality criteria, and SMART objectives
 */

import { supabase } from './supabaseClient'
import { validateAllSMART } from './briefObjectivesService'

/**
 * Validate quality criteria for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of quality criteria results
 */
export async function validateQualityCriteria(briefId) {
  try {
    const { data, error } = await supabase.rpc('check_brief_quality_criteria', {
      p_brief_id: briefId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error validating quality criteria:', error)
    throw error
  }
}

/**
 * Validate SMART objectives for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of validation results
 */
export async function validateSMARTObjectives(briefId) {
  try {
    return await validateAllSMART(briefId)
  } catch (error) {
    console.error('Error validating SMART objectives:', error)
    throw error
  }
}

/**
 * Validate brief completeness
 * @param {string} briefId - Brief ID
 * @returns {Promise<Object>} Completeness validation result
 */
export async function validateCompleteness(briefId) {
  try {
    const { data: brief, error } = await supabase
      .from('project_briefs')
      .select('*')
      .eq('id', briefId)
      .single()

    if (error) throw error

    const sections = {
      project_definition: {
        required: ['background', 'project_objectives', 'project_scope'],
        completed: 0,
        total: 3
      },
      outline_business_case: {
        required: ['outline_business_case_summary'],
        completed: 0,
        total: 1
      },
      product_description: {
        required: [], // Checked separately via products table
        completed: 0,
        total: 1
      },
      project_approach: {
        required: ['project_approach_description'],
        completed: 0,
        total: 1
      },
      team_structure: {
        required: ['team_structure_description'],
        completed: 0,
        total: 1
      },
      role_descriptions: {
        required: [], // Checked separately via roles table
        completed: 0,
        total: 1
      },
      references: {
        required: [], // Checked separately via references table
        completed: 0,
        total: 1
      }
    }

    // Check project definition
    sections.project_definition.completed = sections.project_definition.required.filter(
      field => brief[field] && brief[field].trim().length > 0
    ).length

    // Check outline business case
    sections.outline_business_case.completed = sections.outline_business_case.required.filter(
      field => brief[field] && brief[field].trim().length > 0
    ).length

    // Check project approach
    sections.project_approach.completed = sections.project_approach.required.filter(
      field => brief[field] && brief[field].trim().length > 0
    ).length

    // Check team structure
    sections.team_structure.completed = sections.team_structure.required.filter(
      field => brief[field] && brief[field].trim().length > 0
    ).length

    // Check products
    const { data: products } = await supabase
      .from('brief_product_descriptions')
      .select('id')
      .eq('brief_id', briefId)
      .limit(1)

    sections.product_description.completed = products && products.length > 0 ? 1 : 0

    // Check roles (need at least Executive and PM)
    const { data: roles } = await supabase
      .from('brief_role_descriptions')
      .select('role_category')
      .eq('brief_id', briefId)

    const hasExecutive = roles?.some(r => r.role_category === 'executive')
    const hasPM = roles?.some(r => r.role_category === 'project_manager')
    sections.role_descriptions.completed = (hasExecutive && hasPM) ? 1 : 0

    // Check references (need mandate link)
    const { data: references } = await supabase
      .from('brief_references')
      .select('reference_type')
      .eq('brief_id', briefId)
      .eq('reference_type', 'mandate')
      .limit(1)

    sections.references.completed = references && references.length > 0 ? 1 : 0

    // Calculate totals
    let totalCompleted = 0
    let totalRequired = 0
    Object.values(sections).forEach(section => {
      totalCompleted += section.completed
      totalRequired += section.total
    })

    const completionPercentage = totalRequired > 0
      ? Math.round((totalCompleted / totalRequired) * 100)
      : 0

    return {
      brief_id: briefId,
      sections,
      total_completed: totalCompleted,
      total_required: totalRequired,
      completion_percentage: completionPercentage,
      is_complete: completionPercentage === 100
    }
  } catch (error) {
    console.error('Error validating completeness:', error)
    throw error
  }
}

/**
 * Check mandate alignment
 * @param {string} briefId - Brief ID
 * @param {string} mandateId - Mandate ID (optional, will use brief's mandate if not provided)
 * @returns {Promise<Object>} Alignment check result
 */
export async function checkMandateAlignment(briefId, mandateId = null) {
  try {
    // Get brief
    const { data: brief, error: briefError } = await supabase
      .from('project_briefs')
      .select('mandate_id, background, project_objectives, outline_business_case_summary, project_scope')
      .eq('id', briefId)
      .single()

    if (briefError) throw briefError

    const targetMandateId = mandateId || brief.mandate_id
    if (!targetMandateId) {
      return {
        aligned: false,
        score: 0,
        notes: 'No mandate linked to brief'
      }
    }

    // Get mandate
    const { data: mandate, error: mandateError } = await supabase
      .from('project_mandates')
      .select('background, project_objectives, outline_business_case, scope')
      .eq('id', targetMandateId)
      .single()

    if (mandateError) throw mandateError

    // Compare fields
    const comparisons = {
      background: {
        brief: brief.background || '',
        mandate: mandate.background || '',
        aligned: (brief.background || '').toLowerCase().includes((mandate.background || '').toLowerCase().substring(0, 50)) ||
                 (mandate.background || '').toLowerCase().includes((brief.background || '').toLowerCase().substring(0, 50))
      },
      objectives: {
        brief: brief.project_objectives || '',
        mandate: mandate.project_objectives || '',
        aligned: (brief.project_objectives || '').toLowerCase().includes((mandate.project_objectives || '').toLowerCase().substring(0, 50)) ||
                 (mandate.project_objectives || '').toLowerCase().includes((brief.project_objectives || '').toLowerCase().substring(0, 50))
      },
      business_case: {
        brief: brief.outline_business_case_summary || '',
        mandate: mandate.outline_business_case || '',
        aligned: (brief.outline_business_case_summary || '').toLowerCase().includes((mandate.outline_business_case || '').toLowerCase().substring(0, 50)) ||
                 (mandate.outline_business_case || '').toLowerCase().includes((brief.outline_business_case_summary || '').toLowerCase().substring(0, 50))
      },
      scope: {
        brief: brief.project_scope || '',
        mandate: mandate.scope || '',
        aligned: (brief.project_scope || '').toLowerCase().includes((mandate.scope || '').toLowerCase().substring(0, 50)) ||
                 (mandate.scope || '').toLowerCase().includes((brief.project_scope || '').toLowerCase().substring(0, 50))
      }
    }

    const alignedCount = Object.values(comparisons).filter(c => c.aligned).length
    const alignmentScore = Math.round((alignedCount / Object.keys(comparisons).length) * 100)

    return {
      aligned: alignmentScore >= 75,
      score: alignmentScore,
      comparisons,
      notes: alignmentScore >= 75
        ? 'Brief aligns well with mandate'
        : `Only ${alignedCount} of ${Object.keys(comparisons).length} fields align with mandate`
    }
  } catch (error) {
    console.error('Error checking mandate alignment:', error)
    throw error
  }
}

export default {
  validateQualityCriteria,
  validateSMARTObjectives,
  validateCompleteness,
  checkMandateAlignment
}
