/**
 * Account Service
 * Handles account (organization) management for PM Platform
 *
 * IMPORTANT: This is PM Platform specific - uses appDb (public schema)
 * NOT used by Simulator (which is individual-based, not account-based)
 */

import { appDb } from './supabase/supabaseClient'

/**
 * Create a new account
 * @param {string} ownerUserId - Internal user ID (not auth_user_id)
 * @param {object} accountData - Account information
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createAccount(ownerUserId, accountData) {
  try {
    const { data, error } = await appDb
      .from('accounts')
      .insert({
        owner_user_id: ownerUserId,
        account_name: accountData.accountName,
        account_code: accountData.accountCode || null, // Auto-generated if null
        account_type: accountData.accountType || 'individual',
        company_name: accountData.companyName || null,
        billing_email: accountData.billingEmail || null,
        primary_email: accountData.primaryEmail || null,
        primary_phone: accountData.primaryPhone || null,
        country_code: accountData.countryCode || null,
        default_timezone: accountData.defaultTimezone || 'UTC',
        default_currency: accountData.defaultCurrency || 'USD',
        default_language: accountData.defaultLanguage || 'en',
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
    console.error('Error creating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to create account',
    }
  }
}

/**
 * Get account by ID
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountById(accountId) {
  try {
    const { data, error } = await appDb
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch account',
    }
  }
}

/**
 * Get accounts for current user (owned or member)
 * Uses the get_user_accounts() database function
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUserAccounts() {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await appDb.rpc('get_user_accounts', {
      p_auth_user_id: user.id,
    })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching user accounts:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch accounts',
    }
  }
}

/**
 * Update account details
 * @param {string} accountId - Account UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function updateAccount(accountId, updates) {
  try {
    const { data, error } = await appDb
      .from('accounts')
      .update({
        account_name: updates.accountName,
        account_display_name: updates.accountDisplayName,
        company_name: updates.companyName,
        billing_email: updates.billingEmail,
        primary_email: updates.primaryEmail,
        primary_phone: updates.primaryPhone,
        address_line1: updates.addressLine1,
        address_line2: updates.addressLine2,
        city: updates.city,
        state_province: updates.stateProvince,
        postal_code: updates.postalCode,
        country_code: updates.countryCode,
        default_timezone: updates.defaultTimezone,
        default_currency: updates.defaultCurrency,
        logo_url: updates.logoUrl,
        brand_color: updates.brandColor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error updating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update account',
    }
  }
}

/**
 * Get account projects with member counts
 * Uses the get_account_projects() database function
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAccountProjects(accountId) {
  try {
    const { data, error } = await appDb.rpc('get_account_projects', {
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account projects:', error)
    return {
      success: false,
      data: [],
      error: error.message || 'Failed to fetch account projects',
    }
  }
}

/**
 * Get account subscription details
 * Uses the get_account_subscription() database function
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountSubscription(accountId) {
  try {
    const { data, error } = await appDb.rpc('get_account_subscription', {
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      data: data && data.length > 0 ? data[0] : null,
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account subscription:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch subscription',
    }
  }
}

/**
 * Check if current user is account owner
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, isOwner: boolean, error: string|null}>}
 */
export async function isAccountOwner(accountId) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await appDb.rpc('is_account_owner', {
      p_auth_user_id: user.id,
      p_account_id: accountId,
    })

    if (error) throw error

    return {
      success: true,
      isOwner: data === true,
      error: null,
    }
  } catch (error) {
    console.error('Error checking account ownership:', error)
    return {
      success: false,
      isOwner: false,
      error: error.message || 'Failed to check ownership',
    }
  }
}

/**
 * Get account statistics
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAccountStats(accountId) {
  try {
    // Get projects count
    const { data: projects, error: projectsError } = await appDb
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('is_deleted', false)

    if (projectsError) throw projectsError

    // Get total members across all projects
    const { data: members, error: membersError } = await appDb
      .from('user_roles')
      .select('user_id', { count: 'exact' })
      .in(
        'project_id',
        appDb.from('projects').select('id').eq('account_id', accountId).eq('is_deleted', false)
      )
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (membersError) throw membersError

    // Get unique member count
    const uniqueMembers = members ? new Set(members.map(m => m.user_id)).size : 0

    return {
      success: true,
      data: {
        projectCount: projects?.length || 0,
        totalMembers: uniqueMembers,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching account stats:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch account statistics',
    }
  }
}

/**
 * Suspend account (admin only)
 * @param {string} accountId - Account UUID
 * @param {string} reason - Suspension reason
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function suspendAccount(accountId, reason) {
  try {
    const { data: { user } } = await appDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get user ID from auth user
    const { data: userData, error: userError } = await appDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError) throw userError

    const { data, error } = await appDb
      .from('accounts')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: reason,
        suspended_by: userData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error suspending account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to suspend account',
    }
  }
}

/**
 * Reactivate suspended account (admin only)
 * @param {string} accountId - Account UUID
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function reactivateAccount(accountId) {
  try {
    const { data, error } = await appDb
      .from('accounts')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspended_reason: null,
        suspended_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (error) {
    console.error('Error reactivating account:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to reactivate account',
    }
  }
}

export default {
  createAccount,
  getAccountById,
  getUserAccounts,
  updateAccount,
  getAccountProjects,
  getAccountSubscription,
  isAccountOwner,
  getAccountStats,
  suspendAccount,
  reactivateAccount,
}
