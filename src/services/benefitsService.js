import { platformDb } from './supabase/supabaseClient'

/**
 * Benefits Service - API functions for Benefits Realization Tracking module
 */

// ================================================
// BENEFITS
// ================================================

/**
 * Get all benefits
 */
export async function getBenefits(filters = {}) {
  let query = platformDb
    .from('benefits')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      project:project_id (
        id,
        project_name,
        project_code,
        status_id
      ),
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.benefit_category) {
    query = query.eq('benefit_category', filters.benefit_category)
  }

  if (filters.benefit_type) {
    query = query.eq('benefit_type', filters.benefit_type)
  }

  if (filters.benefit_status) {
    query = query.eq('benefit_status', filters.benefit_status)
  }

  if (filters.search) {
    query = query.or(`benefit_name.ilike.%${filters.search}%,benefit_code.ilike.%${filters.search}%,benefit_description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single benefit by ID
 */
export async function getBenefit(benefitId) {
  const { data, error } = await platformDb
    .from('benefits')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      project:project_id (
        id,
        project_name,
        project_code,
        status_id
      ),
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .eq('id', benefitId)
    .eq('is_deleted', false)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update a benefit
 */
export async function saveBenefit(benefitData, benefitId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...benefitData,
    updated_by: user.id,
  }

  if (benefitId) {
    const { data, error } = await platformDb
      .from('benefits')
      .update(updateData)
      .eq('id', benefitId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.benefit_owner_user_id) {
      updateData.benefit_owner_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('benefits')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a benefit (soft delete)
 */
export async function deleteBenefit(benefitId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefits')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', benefitId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Calculate benefit realization percentage
 */
export async function calculateBenefitRealization(benefitId) {
  const { data, error } = await platformDb.rpc('calculate_benefit_realization', {
    p_benefit_id: benefitId,
  })

  if (error) throw error
  return data || 0
}

// ================================================
// BENEFIT MEASURES
// ================================================

/**
 * Get benefit measures
 */
export async function getBenefitMeasures(benefitId) {
  const { data, error } = await platformDb
    .from('benefit_measures')
    .select(`
      *,
      measure_owner:measure_owner_user_id (id, email, full_name)
    `)
    .eq('benefit_id', benefitId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a benefit measure
 */
export async function saveBenefitMeasure(benefitId, measureData, measureId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...measureData,
    benefit_id: benefitId,
    updated_by: user.id,
  }

  if (measureId) {
    const { data, error } = await platformDb
      .from('benefit_measures')
      .update(updateData)
      .eq('id', measureId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.measure_owner_user_id) {
      updateData.measure_owner_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('benefit_measures')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a benefit measure (soft delete)
 */
export async function deleteBenefitMeasure(measureId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefit_measures')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', measureId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// BENEFIT MEASUREMENTS
// ================================================

/**
 * Get benefit measurements
 */
export async function getBenefitMeasurements(benefitId, filters = {}) {
  let query = platformDb
    .from('benefit_measurements')
    .select(`
      *,
      measure:measure_id (
        id,
        measure_name,
        measure_unit
      ),
      verified_by:verified_by_user_id (id, email, full_name),
      created_by_user:created_by (id, email, full_name)
    `)
    .eq('benefit_id', benefitId)
    .eq('is_deleted', false)

  if (filters.measurement_type) {
    query = query.eq('measurement_type', filters.measurement_type)
  }

  if (filters.start_date && filters.end_date) {
    query = query.gte('measurement_date', filters.start_date)
    query = query.lte('measurement_date', filters.end_date)
  }

  const { data, error } = await query.order('measurement_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a benefit measurement
 */
export async function saveBenefitMeasurement(benefitId, measurementData, measurementId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...measurementData,
    benefit_id: benefitId,
    updated_by: user.id,
  }

  if (measurementId) {
    const { data, error } = await platformDb
      .from('benefit_measurements')
      .update(updateData)
      .eq('id', measurementId)
      .select()
      .single()

    if (error) throw error
    
    // Update benefit's current_value and last_measured_date
    await updateBenefitMeasurementValues(benefitId)
    
    return data
  } else {
    updateData.created_by = user.id
    const { data, error } = await platformDb
      .from('benefit_measurements')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    
    // Update benefit's current_value and last_measured_date
    await updateBenefitMeasurementValues(benefitId)
    
    return data
  }
}

/**
 * Update benefit's current_value and last_measured_date from latest measurement
 */
async function updateBenefitMeasurementValues(benefitId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Get latest actual measurement
  const { data: latestMeasurement } = await platformDb
    .from('benefit_measurements')
    .select('measurement_value, measurement_date')
    .eq('benefit_id', benefitId)
    .eq('measurement_type', 'actual')
    .eq('is_deleted', false)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .single()

  if (latestMeasurement) {
    await platformDb
      .from('benefits')
      .update({
        current_value: latestMeasurement.measurement_value,
        last_measured_date: latestMeasurement.measurement_date,
        updated_by: user.id,
      })
      .eq('id', benefitId)
  }
}

/**
 * Delete a benefit measurement (soft delete)
 */
export async function deleteBenefitMeasurement(measurementId, benefitId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefit_measurements')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', measurementId)
    .select()
    .single()

  if (error) throw error

  // Update benefit's current_value and last_measured_date
  await updateBenefitMeasurementValues(benefitId)

  return data
}

// ================================================
// BENEFIT TARGETS
// ================================================

/**
 * Get benefit targets
 */
export async function getBenefitTargets(benefitId) {
  const { data, error } = await platformDb
    .from('benefit_targets')
    .select(`
      *,
      target_owner:target_owner_user_id (id, email, full_name)
    `)
    .eq('benefit_id', benefitId)
    .eq('is_deleted', false)
    .order('target_date', { ascending: true })

  if (error) throw error
  return data
}

/**
 * Create or update a benefit target
 */
export async function saveBenefitTarget(benefitId, targetData, targetId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...targetData,
    benefit_id: benefitId,
    updated_by: user.id,
  }

  if (targetId) {
    const { data, error } = await platformDb
      .from('benefit_targets')
      .update(updateData)
      .eq('id', targetId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.target_owner_user_id) {
      updateData.target_owner_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('benefit_targets')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a benefit target (soft delete)
 */
export async function deleteBenefitTarget(targetId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefit_targets')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', targetId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// BENEFIT ATTRIBUTIONS
// ================================================

/**
 * Get benefit attributions
 */
export async function getBenefitAttributions(benefitId) {
  const { data, error } = await platformDb
    .from('benefit_attributions')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      attributed_by:attributed_by_user_id (id, email, full_name),
      approved_by:approved_by_user_id (id, email, full_name)
    `)
    .eq('benefit_id', benefitId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a benefit attribution
 */
export async function saveBenefitAttribution(benefitId, attributionData, attributionId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...attributionData,
    benefit_id: benefitId,
    updated_by: user.id,
  }

  if (attributionId) {
    const { data, error } = await platformDb
      .from('benefit_attributions')
      .update(updateData)
      .eq('id', attributionId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.attributed_by_user_id) {
      updateData.attributed_by_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('benefit_attributions')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a benefit attribution (soft delete)
 */
export async function deleteBenefitAttribution(attributionId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefit_attributions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', attributionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// BENEFIT REALIZATION REPORTS
// ================================================

/**
 * Get benefit realization reports
 */
export async function getBenefitRealizationReports(filters = {}) {
  let query = platformDb
    .from('benefit_realization_reports')
    .select(`
      *,
      portfolio:portfolio_id (
        id,
        portfolio_name,
        portfolio_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      project:project_id (
        id,
        project_name,
        project_code
      ),
      report_owner:report_owner_user_id (id, email, full_name),
      generated_by:generated_by_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false)

  if (filters.portfolio_id) {
    query = query.eq('portfolio_id', filters.portfolio_id)
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id)
  }

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.report_type) {
    query = query.eq('report_type', filters.report_type)
  }

  if (filters.report_status) {
    query = query.eq('report_status', filters.report_status)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Create or update a benefit realization report
 */
export async function saveBenefitRealizationReport(reportData, reportId = null) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const updateData = {
    ...reportData,
    updated_by: user.id,
  }

  if (reportId) {
    const { data, error } = await platformDb
      .from('benefit_realization_reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    updateData.created_by = user.id
    if (!updateData.report_owner_user_id) {
      updateData.report_owner_user_id = user.id
    }
    if (!updateData.generated_by_user_id) {
      updateData.generated_by_user_id = user.id
    }
    const { data, error } = await platformDb
      .from('benefit_realization_reports')
      .insert(updateData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

/**
 * Delete a benefit realization report (soft delete)
 */
export async function deleteBenefitRealizationReport(reportId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await platformDb
    .from('benefit_realization_reports')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      updated_by: user.id,
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ================================================
// DASHBOARD & SUMMARY FUNCTIONS
// ================================================

/**
 * Get benefits dashboard stats
 */
export async function getBenefitsDashboardStats(filters = {}) {
  try {
    const benefits = await getBenefits(filters)

    const stats = {
      total: benefits.length,
      identified: benefits.filter(b => b.benefit_status === 'identified').length,
      planned: benefits.filter(b => b.benefit_status === 'planned').length,
      inProgress: benefits.filter(b => b.benefit_status === 'in_progress').length,
      realized: benefits.filter(b => b.benefit_status === 'realized').length,
      partiallyRealized: benefits.filter(b => b.benefit_status === 'partially_realized').length,
      byCategory: benefits.reduce((acc, b) => {
        acc[b.benefit_category] = (acc[b.benefit_category] || 0) + 1
        return acc
      }, {}),
      byType: benefits.reduce((acc, b) => {
        acc[b.benefit_type] = (acc[b.benefit_type] || 0) + 1
        return acc
      }, {}),
      totalEstimatedValue: benefits.reduce((sum, b) => sum + (parseFloat(b.estimated_value) || 0), 0),
      totalRealizedValue: benefits.reduce((sum, b) => sum + (parseFloat(b.realized_value_currency) || 0), 0),
    }

    // Calculate overall realization percentage
    if (stats.total > 0) {
      stats.realizationPercentage = (stats.realized / stats.total) * 100
    } else {
      stats.realizationPercentage = 0
    }

    return stats
  } catch (error) {
    console.error('Error getting benefits dashboard stats:', error)
    throw error
  }
}

/**
 * Get benefits vs costs analysis
 */
export async function getBenefitsVsCosts(filters = {}) {
  try {
    const benefits = await getBenefits(filters)

    const analysis = {
      totalBenefits: benefits.reduce((sum, b) => sum + (parseFloat(b.estimated_value) || 0), 0),
      realizedBenefits: benefits
        .filter(b => b.benefit_status === 'realized' || b.benefit_status === 'partially_realized')
        .reduce((sum, b) => sum + (parseFloat(b.realized_value_currency) || b.estimated_value || 0), 0),
      totalCosts: 0, // TODO: Fetch from projects/portfolio
      netBenefits: 0,
      roi: 0,
    }

    // Calculate net benefits and ROI
    if (analysis.totalCosts > 0) {
      analysis.netBenefits = analysis.totalBenefits - analysis.totalCosts
      analysis.roi = (analysis.netBenefits / analysis.totalCosts) * 100
    }

    return analysis
  } catch (error) {
    console.error('Error getting benefits vs costs analysis:', error)
    throw error
  }
}

/**
 * Get benefits rollup for a programme
 * @param {string} programmeId - Programme ID
 * @returns {Promise<Object>} Benefits rollup data
 */
export async function getBenefitsRollup(programmeId) {
  try {
    const { data, error } = await platformDb
      .from('programme_rollup_view')
      .select('total_planned_benefits, total_forecast_benefits, total_realised_benefits')
      .eq('programme_id', programmeId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        planned: parseFloat(data?.total_planned_benefits || 0),
        forecast: parseFloat(data?.total_forecast_benefits || 0),
        realised: parseFloat(data?.total_realised_benefits || 0),
        programme_id: programmeId
      }
    }
  } catch (error) {
    console.error('Error getting benefits rollup:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get portfolio benefits rollup
 * @param {string} portfolioId - Portfolio ID
 * @returns {Promise<Object>} Portfolio benefits rollup data
 */
export async function getPortfolioBenefitsRollup(portfolioId) {
  try {
    // Get all programmes in this portfolio
    const { data: programmes, error: progError } = await platformDb
      .from('programmes')
      .select('id')
      .eq('portfolio_id', portfolioId)
      .eq('is_deleted', false)

    if (progError) throw progError

    if (!programmes || programmes.length === 0) {
      return {
        success: true,
        data: {
          planned: 0,
          forecast: 0,
          realised: 0,
          portfolio_id: portfolioId,
          programme_count: 0
        }
      }
    }

    const programmeIds = programmes.map(p => p.id)

    // Get rollup data for all programmes
    const { data: rollups, error: rollupError } = await platformDb
      .from('programme_rollup_view')
      .select('total_planned_benefits, total_forecast_benefits, total_realised_benefits')
      .in('programme_id', programmeIds)

    if (rollupError) throw rollupError

    const totals = (rollups || []).reduce((acc, r) => {
      acc.planned += parseFloat(r.total_planned_benefits || 0)
      acc.forecast += parseFloat(r.total_forecast_benefits || 0)
      acc.realised += parseFloat(r.total_realised_benefits || 0)
      return acc
    }, { planned: 0, forecast: 0, realised: 0 })

    return {
      success: true,
      data: {
        ...totals,
        portfolio_id: portfolioId,
        programme_count: programmes.length
      }
    }
  } catch (error) {
    console.error('Error getting portfolio benefits rollup:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get benefits at risk (benefits with low realization rate or overdue)
 * @param {string} accountId - Account ID (optional)
 * @returns {Promise<Object>} Benefits at risk data
 */
export async function getBenefitsAtRisk(accountId = null) {
  try {
    let query = platformDb
      .from('programme_benefits')
      .select(`
        *,
        programme:programme_id (id, programme_name, programme_code),
        project:project_id (id, project_name, project_code)
      `)
      .eq('is_deleted', false)

    if (accountId) {
      // Filter by account through projects
      const { data: projects } = await platformDb
        .from('projects')
        .select('id')
        .eq('account_id', accountId)
        .eq('is_deleted', false)

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id)
        query = query.in('project_id', projectIds)
      } else {
        return { success: true, data: [] }
      }
    }

    const { data: benefits, error } = await query

    if (error) throw error

    // Calculate at-risk benefits (less than 80% realized or overdue)
    const atRiskBenefits = (benefits || []).filter(benefit => {
      const target = parseFloat(benefit.target_value || 0)
      const realized = parseFloat(benefit.realized_value || 0)
      const current = parseFloat(benefit.current_value || 0)
      const totalRealized = realized + current

      // At risk if less than 80% realized
      const realizationRate = target > 0 ? (totalRealized / target) * 100 : 0
      if (realizationRate < 80) return true

      // At risk if overdue (if there's a target date)
      if (benefit.target_date) {
        const targetDate = new Date(benefit.target_date)
        const today = new Date()
        if (targetDate < today && realizationRate < 100) return true
      }

      return false
    })

    return {
      success: true,
      data: atRiskBenefits.map(b => ({
        ...b,
        realization_rate: b.target_value > 0 
          ? ((parseFloat(b.realized_value || 0) + parseFloat(b.current_value || 0)) / parseFloat(b.target_value)) * 100 
          : 0
      }))
    }
  } catch (error) {
    console.error('Error getting benefits at risk:', error)
    return { success: false, error: error.message }
  }
}

// ================================================
// BENEFITS REVIEW PLAN INTEGRATION
// ================================================

/**
 * Link benefit to a review plan
 */
export async function linkBenefitToReviewPlan(benefitId, planId) {
  const { data: { user } } = await platformDb.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (!userRecord) {
    throw new Error('User record not found')
  }

  const { data, error } = await platformDb
    .from('benefits')
    .update({
      review_plan_id: planId,
      updated_by: userRecord.id,
    })
    .eq('id', benefitId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get benefits by review plan
 */
export async function getBenefitsByReviewPlan(planId) {
  const { data, error } = await platformDb
    .from('benefits')
    .select(`
      *,
      benefit_owner:benefit_owner_user_id (id, email, full_name),
      project:project_id (
        id,
        project_name,
        project_code
      )
    `)
    .eq('review_plan_id', planId)
    .eq('is_deleted', false)
    .order('benefit_name', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get benefits without a review plan for a project
 */
export async function getBenefitsWithoutReviewPlan(projectId) {
  const { data, error } = await platformDb
    .from('benefits')
    .select(`
      *,
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .eq('project_id', projectId)
    .is('review_plan_id', null)
    .eq('is_deleted', false)
    .order('benefit_name', { ascending: true })

  if (error) throw error
  return data || []
}
