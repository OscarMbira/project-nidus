/**
 * Seat Management Service
 * Handles seat allocation and extra seat purchases for Platform
 *
 * IMPORTANT: Platform specific - uses appDb (public schema)
 * Manages project seat limits and purchases
 */

import { appDb } from './supabase/supabaseClient'

/**
 * Get project seat allocation
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getProjectSeatAllocation(projectId) {
  try {
    const { data, error } = await appDb
      .from('project_seat_allocations')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no allocation exists, create one
    if (!data) {
      return await initializeSeatAllocation(projectId)
    }

    // Refresh seat count
    await appDb.rpc('calculate_project_seat_usage', {
      p_project_id: projectId,
    })

    // Fetch updated data
    const { data: updatedData, error: updateError } = await appDb
      .from('project_seat_allocations')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      data: updatedData,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching seat allocation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch seat allocation',
    }
  }
}

/**
 * Initialize seat allocation for a project
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
async function initializeSeatAllocation(projectId) {
  try {
    // Get project details
    const { data: project, error: projectError } = await appDb
      .from('projects')
      .select('account_id')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    if (!project.account_id) {
      return {
        success: false,
        data: null,
        error: 'Project must be linked to an account',
      }
    }

    // Get subscription details
    const { data: subscription, error: subError } = await appDb
      .from('pm_subscriptions')
      .select('id, base_users_per_project')
      .eq('account_id', project.account_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const baseSeats = subscription?.base_users_per_project || 30

    // Create allocation
    const { data, error } = await appDb
      .from('project_seat_allocations')
      .insert({
        project_id: projectId,
        account_id: project.account_id,
        subscription_id: subscription?.id || null,
        included_seats: baseSeats,
        extra_seats_purchased: 0,
        current_user_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error initializing seat allocation:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to initialize seat allocation',
    }
  }
}

/**
 * Check seat availability for a project
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, hasAvailable: boolean, data: object|null, error: string|null}>}
 */
export async function checkSeatAvailability(projectId) {
  try {
    const { data, error } = await appDb.rpc('check_seat_availability', {
      p_project_id: projectId,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return {
        success: false,
        hasAvailable: false,
        data: null,
        error: 'Seat allocation not found',
      }
    }

    const seatInfo = data[0]

    return {
      success: true,
      hasAvailable: seatInfo.has_available_seats,
      data: seatInfo,
      error: null,
    }
  } catch (error) {
    console.error('Error checking seat availability:', error)
    return {
      success: false,
      hasAvailable: false,
      data: null,
      error: error.message || 'Failed to check seat availability',
    }
  }
}

/**
 * Purchase extra seats for a project
 * @param {string} projectId - Project UUID
 * @param {number} quantity - Number of seats to purchase
 * @param {object} paymentData - Payment information
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function purchaseExtraSeats(projectId, quantity, paymentData) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get internal user ID
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    // Get project and account details
    const { data: project, error: projectError } = await appDb
      .from('projects')
      .select('account_id')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // Get subscription to get pricing
    const { data: subscription, error: subError } = await appDb
      .from('pm_subscriptions')
      .select('id, extra_user_price, extra_user_discount_rate')
      .eq('account_id', project.account_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError) throw subError

    const pricePerSeat = subscription.extra_user_price || 0.80
    const discountRate = subscription.extra_user_discount_rate || 0.7
    const discountedPrice = pricePerSeat * discountRate
    const totalAmount = discountedPrice * quantity

    // Create purchase record
    const { data: purchase, error: purchaseError } = await appDb
      .from('extra_seat_purchases')
      .insert({
        project_id: projectId,
        account_id: project.account_id,
        subscription_id: subscription.id,
        seats_purchased: quantity,
        price_per_seat: discountedPrice,
        total_amount: totalAmount,
        currency: paymentData.currency || 'USD',
        payment_provider: paymentData.provider || 'paynow',
        payment_reference: paymentData.reference || null,
        payment_transaction_id: paymentData.transactionId || null,
        payment_status: paymentData.status || 'pending',
        purchased_by_user_id: userData.id,
        payment_initiated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (purchaseError) throw purchaseError

    // If payment is completed, process the purchase
    if (paymentData.status === 'completed') {
      await processSeatPurchase(purchase.id)
    }

    return {
      success: true,
      data: purchase,
      error: null,
    }
  } catch (error) {
    console.error('Error purchasing extra seats:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to purchase extra seats',
    }
  }
}

/**
 * Process seat purchase after payment confirmation
 * @param {string} purchaseId - Purchase UUID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function processSeatPurchase(purchaseId) {
  try {
    const { data, error } = await appDb.rpc('process_extra_seat_purchase', {
      p_purchase_id: purchaseId,
    })

    if (error) throw error

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('Error processing seat purchase:', error)
    return {
      success: false,
      error: error.message || 'Failed to process seat purchase',
    }
  }
}

/**
 * Get purchase history for a project
 * @param {string} projectId - Project UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getSeatPurchaseHistory(projectId) {
  try {
    const { data, error } = await appDb
      .from('extra_seat_purchases')
      .select(`
        *,
        purchased_by:users!extra_seat_purchases_purchased_by_user_id_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching purchase history:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch purchase history',
    }
  }
}

/**
 * Update purchase payment status
 * @param {string} purchaseId - Purchase UUID
 * @param {string} status - Payment status
 * @param {object} paymentInfo - Additional payment information
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updatePurchaseStatus(purchaseId, status, paymentInfo = {}) {
  try {
    const updateData = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updateData.payment_completed_at = new Date().toISOString()
    } else if (status === 'failed') {
      updateData.payment_failed_at = new Date().toISOString()
    }

    if (paymentInfo.transactionId) {
      updateData.payment_transaction_id = paymentInfo.transactionId
    }

    if (paymentInfo.response) {
      updateData.payment_response = paymentInfo.response
    }

    const { data, error } = await appDb
      .from('extra_seat_purchases')
      .update(updateData)
      .eq('id', purchaseId)
      .select()
      .single()

    if (error) throw error

    // If payment completed, process the purchase
    if (status === 'completed') {
      await processSeatPurchase(purchaseId)
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating purchase status:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update purchase status',
    }
  }
}

export default {
  getProjectSeatAllocation,
  checkSeatAvailability,
  purchaseExtraSeats,
  processSeatPurchase,
  getSeatPurchaseHistory,
  updatePurchaseStatus,
}

